const MANDATORY_COMPETITORS = ['Bilka', 'føtex', 'BR'];
const ALL_COMPETITORS = [
    'avXperten', 'BabySam', 'Coolshop', 'Elgiganten', 
    'happii.dk', 'Jollyroom', 'Proshop.dk', 'ØnskeBørn'
];

let selectedCompetitors = ['Jollyroom', 'Proshop.dk']; // Initial selection
let toyData = [];

async function loadDashboard() {
    try {
        const response = await fetch('toy_prices_daily.json');
        toyData = await response.json();
        
        // Clean up data keys if necessary
        toyData.forEach(item => {
            if (item.prices && item.prices.Proshop) {
                item.prices['Proshop.dk'] = item.prices.Proshop;
            }
        });

        renderCompetitorSelector();
        updateDashboard();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderCompetitorSelector() {
    const container = document.getElementById('competitor-chips');
    container.innerHTML = '';

    // Mandatory Salling Brands
    MANDATORY_COMPETITORS.forEach(brand => {
        const chip = document.createElement('div');
        chip.className = 'chip mandatory active';
        chip.textContent = brand;
        container.appendChild(chip);
    });

    // Toggleable Competitors
    ALL_COMPETITORS.forEach(brand => {
        const chip = document.createElement('div');
        const isActive = selectedCompetitors.includes(brand);
        chip.className = `chip ${isActive ? 'active' : ''}`;
        chip.textContent = brand;
        
        chip.onclick = () => toggleCompetitor(brand);
        container.appendChild(chip);
    });
}

function toggleCompetitor(brand) {
    if (selectedCompetitors.includes(brand)) {
        selectedCompetitors = selectedCompetitors.filter(c => c !== brand);
    } else {
        if (selectedCompetitors.length >= 4) {
            alert('Du kan max vælge 4 eksterne konkurrenter.');
            return;
        }
        selectedCompetitors.push(brand);
    }
    renderCompetitorSelector();
    updateDashboard();
}

function updateDashboard() {
    renderTable(toyData);
    updateStats(toyData);
}

function renderTable(data) {
    const tableHeader = document.querySelector('#price-matrix thead tr');
    const tableBody = document.getElementById('price-data-body');
    
    // Update Headers
    const activeBrands = [...MANDATORY_COMPETITORS, ...selectedCompetitors];
    tableHeader.innerHTML = `
        <th>Rank</th>
        <th>Produkt</th>
        <th>EAN</th>
        ${activeBrands.map(b => `<th>${b}</th>`).join('')}
        <th>Markedets Laveste</th>
    `;

    tableBody.innerHTML = '';

    data.forEach(item => {
        const tr = document.createElement('tr');
        const lowestMarket = parseInt(item.lowest_price);
        
        const getPriceByBrand = (brand) => {
            if (!item.prices) return null;
            const key = Object.keys(item.prices).find(k => k.toLowerCase().includes(brand.toLowerCase()));
            return key ? item.prices[key].price : null;
        };

        const getPriceClass = (price) => {
            if (!price || !lowestMarket) return '';
            return price <= lowestMarket ? 'win' : 'loss';
        };

        const priceCells = activeBrands.map(brand => {
            const price = getPriceByBrand(brand);
            const className = (brand === 'Bilka' || brand === 'føtex' || brand === 'BR') ? getPriceClass(price) : '';
            return `<td class="${className}">${price ? price + ' kr.' : '-'}</td>`;
        }).join('');

        tr.innerHTML = `
            <td><span class="rank-badge">${item.rank}</span></td>
            <td><strong>${item.product_name}</strong></td>
            <td><span class="ean-code">${item.ean}</span></td>
            ${priceCells}
            <td class="lowest">${item.lowest_price} kr.</td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateStats(data) {
    document.getElementById('product-count').textContent = data.length;
    
    const wins = data.filter(item => {
        if (!item.prices) return false;
        const bilkaPrice = item.prices.Bilka ? item.prices.Bilka.price : Infinity;
        const fotexPrice = item.prices.føtex ? item.prices.føtex.price : Infinity;
        const lowestMarket = parseInt(item.lowest_price);
        return (bilkaPrice === lowestMarket || fotexPrice === lowestMarket);
    }).length;

    document.getElementById('salling-wins').textContent = wins;
    
    if (data.length > 0) {
        const lastDate = new Date(data[0].timestamp).toLocaleDateString('da-DK', {
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('last-update').textContent = lastDate;
    }
}

// Simulated Campaign Data (based on my crawl)
const campaigns = [
    {
        retailer: 'Proshop',
        title: 'LEGO Hot Deals',
        items: [
            { name: 'Super Mario Game Boy', price: '299 kr.' },
            { name: 'Påskehare Sæt', price: '59 kr.' }
        ]
    },
    {
        retailer: 'BR',
        title: 'Build-A-Bear Jubilæum',
        items: [
            { name: 'Bamser & Tilbehør', price: '30-40% Rabat' },
            { name: 'Fyldestation', price: '562 kr.' }
        ]
    },
    {
        retailer: 'Jollyroom',
        title: 'Forårsstart',
        items: [
            { name: 'Cloudberry Kæphest', price: '169 kr.' },
            { name: 'Alice & Fox Boldbassin', price: '699 kr.' }
        ]
    }
];

function renderCampaigns() {
    const grid = document.getElementById('campaign-cards');
    campaigns.forEach(c => {
        const div = document.createElement('div');
        div.className = 'campaign-card';
        div.innerHTML = `
            <h3>${c.retailer}</h3>
            <p style="font-weight:bold; margin-bottom:1rem;">${c.title}</p>
            <ul>
                ${c.items.map(i => `<li><span>${i.name}</span> <strong>${i.price}</strong></li>`).join('')}
            </ul>
        `;
        grid.appendChild(div);
    });
}

let pollingInterval;

document.getElementById('refresh-btn').addEventListener('click', async () => {
    const btn = document.getElementById('refresh-btn');
    const overlay = document.getElementById('loading-overlay');
    
    try {
        btn.disabled = true;
        const response = await fetch('refresh.php');
        const result = await response.json();
        
        if (result.status === 'success') {
            overlay.classList.remove('hidden');
            startPollingStatus();
        } else {
            alert('Fejl ved start af scrape: ' + result.message);
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Refresh error:', error);
        alert('Der opstod en fejl ved forbindelse til serveren.');
        btn.disabled = false;
    }
});

function startPollingStatus() {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch('status.json?t=' + Date.now());
            if (!response.ok) return;
            
            const status = await response.json();
            
            // Check if status is recent (within last 24 hours to avoid stale data from old runs)
            const isRecent = (Date.now() / 1000) - status.timestamp < 3600; 
            
            if (isRecent) {
                document.getElementById('status-message').textContent = status.message;
                document.getElementById('progress-bar').style.width = status.progress + '%';
                
                if (status.progress >= 95) {
                    // Close to finish, wait a bit then reload
                    setTimeout(() => {
                        clearInterval(pollingInterval);
                        location.reload(); 
                    }, 5000);
                }
            }
        } catch (e) {
            console.error('Polling error:', e);
        }
    }, 3000);
}

window.onload = () => {
    loadDashboard();
    renderCampaigns();
};
