const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const TARGET_URL = 'https://www.pricerunner.dk/ct/72/Legetoej?retailer=17553%2C308%2C6836%2C1152%2C1196%2C2957%2C1170&c=price%2Cbrand%2C57121585%2C59583076%2C58387932%2Cmerchant';
const DATA_FILE = path.join(__dirname, 'toy_prices_daily.json');
async function randomDelay(min = 2000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    console.log(`Waiting for ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
}
async function scrapePriceRunner() {
    console.log('Starting PriceRunner Scraper...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    try {
        console.log(`Navigating to: ${TARGET_URL}`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
        const cookieButton = await page.$('button:has-text("Tillad alle")');
        if (cookieButton) {
            try {
                await cookieButton.click({ timeout: 5000 });
                console.log('Cookies accepted.');
            } catch (e) {
                console.log('Cookie banner not clickable or hidden, proceeding...');
            }
        }
        await randomDelay();
        console.log('Scrolling to load products...');
        for (let i = 0; i < 5; i++) {
            await page.mouse.wheel(0, 1000);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        await randomDelay();
        const products = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            return rows.slice(0, 50).map(row => {
                const linkElement = row.querySelector('td:first-child a');
                return {
                    name: linkElement ? linkElement.innerText.trim() : 'Unknown',
                    url: linkElement ? 'https://www.pricerunner.dk' + linkElement.getAttribute('href') : null
                };
            }).filter(p => p.url);
        });
        console.log(`Found ${products.length} products. Proceeding to extract details...`);
        const results = [];
        for (const product of products) {
            console.log(`Scraping details for: ${product.name}`);
            const productPage = await context.newPage();
            try {
                await productPage.goto(product.url, { waitUntil: 'networkidle' });
                await randomDelay(1000, 3000);
                const showAllButton = await productPage.$('button:has-text("Vis alle"), button:has-text("Se alle")');
                if (showAllButton) await showAllButton.click();
                const details = await productPage.evaluate(() => {
                    let ean = 'N/A';
                    const specs = Array.from(document.querySelectorAll('dt, span')).find(el => el.innerText.includes('EAN'));
                    if (specs && specs.nextElementSibling) {
                        ean = specs.nextElementSibling.innerText.trim();
                    } else {
                        const bodyText = document.body.innerText;
                        const match = bodyText.match(/\\b\\d{13}\\b/);
                        if (match) ean = match[0];
                    }
                    const retailerRows = Array.from(document.querySelectorAll('[data-testid="price-row"], .REhZwOtdrZ, tr')).filter(r => r.innerText.includes('kr.'));
                    const stores = {};
                    retailerRows.forEach(row => {
                        const rowText = row.innerText.toLowerCase();
                        let storeName = null;
                        if (rowText.includes('bilka')) storeName = 'Bilka';
                        else if (rowText.includes('føtex')) storeName = 'føtex';
                        else if (rowText.includes('netto')) storeName = 'Netto';
                        else if (rowText.includes('jollyroom')) storeName = 'Jollyroom';
                        else if (rowText.includes('br')) storeName = 'BR';
                        else if (rowText.includes('proshop')) storeName = 'Proshop';
                        if (storeName) {
                            const priceMatch = row.innerText.match(/(\\d+\\.\\?\\d*)\\s*kr\\./);
                            const price = priceMatch ? parseFloat(priceMatch[1].replace('.', '')) : null;
                            const isMember = rowText.includes('medlem') || rowText.includes('club');
                            stores[storeName] = { price, isMember };
                        }
                    });
                    const allPrices = Array.from(document.querySelectorAll('span')).map(s => s.innerText.match(/(\\d+\\.\\?\\d*)\\s*kr\\./)).filter(m => m).map(m => parseFloat(m[1].replace('.', '')));
                    const lowest = allPrices.length > 0 ? Math.min(...allPrices) : null;
                    return { ean, retailers: stores, lowest };
                });
                results.push({
                    name: product.name,
                    ean: details.ean,
                    retailers: details.retailers,
                    market_lowest: details.lowest,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.error(`Error scraping ${product.name}:`, err.message);
            } finally {
                await productPage.close();
            }
            await randomDelay();
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2));
        console.log(`Scraping complete. Saved to ${DATA_FILE}`);
    } catch (error) {
        console.error('Fatal Scraper Error:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}
scrapePriceRunner();
