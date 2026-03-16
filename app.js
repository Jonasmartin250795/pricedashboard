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
        
        // Clean up data keys if necessary (normalize 'Proshop' to 'Proshop.dk')
        toyData.forEach(item => {
            if (item.prices.Proshop) {
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
    if (!container) return;
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
    if (!tableHeader || !tableBody) return;
    
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
            const key = Object.keys(item.prices).find(k => k.toLowerCase().includes(brand.toLowerCase()));
            return key ? parseInt(item.prices[key]) : null;
        };

        const getPriceClass = (price) => {
            if (!price) return '';
            return price === lowestMarket ? 'win' : 'loss';
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
    const productCount = document.getElementById('product-count');
    const sallingWins = document.getElementById('salling-wins');
    const lastUpdate = document.getElementById('last-update');
    
    if (productCount) productCount.textContent = data.length;
    
    const wins = data.filter(item => {
        const bilkaPrice = item.prices.Bilka ? parseInt(item.prices.Bilka) : Infinity;
        const fotexPrice = item.prices.føtex ? parseInt(item.prices.føtex) : Infinity;
        const lowestMarket = parseInt(item.lowest_price);
        return (bilkaPrice === lowestMarket || fotexPrice === lowestMarket);
    }).length;

    if (sallingWins) sallingWins.textContent = wins;
    
    if (data.length > 0 && lastUpdate) {
        const lastDate = new Date(data[0].timestamp).toLocaleDateString('da-DK', {
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdate.textContent = lastDate;
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
    if (!grid) return;
    grid.innerHTML = ''; // Clear previous
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

const refreshBtn = document.getElementById('refresh-btn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        alert('Trigged manuel "Price Refresh" via Agent Subagent...');
    });
}

window.onload = () => {
    loadDashboard();
    renderCampaigns();
};
