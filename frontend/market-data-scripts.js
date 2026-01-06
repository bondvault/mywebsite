// c:\Users\Administrator\.vscode\mywebsite\frontend\market-data-scripts.js

// CONFIGURATION: Change this to your live backend domain when deploying (e.g., "https://api.bondvault.com")
const API_DOMAIN = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || window.location.protocol === "file:"
    ? "http://127.0.0.1:5000" : "https://bondvault-api.onrender.com";
const API_URL = `${API_DOMAIN}/api/bonds`;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Contact Modal (Works on all pages)
    setupContactModal();

    // 2. Fetch Data if container exists
    const container = document.getElementById('bonds-container');
    if (container) {
        // UX FIX: Show loading immediately to prevent "glitchy" blank space
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Loading Market Data...</p>';

        // Check if we are on home page (limit to 3) or market page (limit 50)
        const isHome = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
        fetchBonds(container, '', isHome ? 3 : 50);
    }
    
    // 3. Initialize Search (Only for market-data.html)
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('bonds-search');
    if(searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => fetchBonds(container, searchInput.value));
        searchInput.addEventListener('keyup', (e) => {
            if(e.key === 'Enter') fetchBonds(container, searchInput.value);
        });
    }

    // 4. Initialize Filters (Only for market-data.html)
    const applyFilterBtn = document.querySelector('.apply-filters');
    if(applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const filters = {
                issuer: Array.from(document.querySelectorAll('input[name="issuer"]:checked')).map(cb => cb.value),
                maturity: Array.from(document.querySelectorAll('input[name="maturity"]:checked')).map(cb => cb.value),
                agency: Array.from(document.querySelectorAll('input[name="agency"]:checked')).map(cb => cb.value)
            };
            fetchBonds(container, '', 50, filters);
        });
    }
});

// --- Data Fetching Logic ---
async function fetchBonds(container, searchQuery = '', limit = 50, filters = {}) {
    try {
        // UX: Show loading state only if searching, otherwise it flickers too much
        if(searchQuery || Object.keys(filters).length > 0) container.innerHTML = '<p style="text-align:center; padding:20px;">Searching Vault...</p>';
        
        // SCALABILITY: Send search and limit to backend
        let url = `${API_URL}?limit=${limit}`;
        if(searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        // Append Filters
        if(filters.issuer) filters.issuer.forEach(v => url += `&issuer=${encodeURIComponent(v)}`);
        if(filters.maturity) filters.maturity.forEach(v => url += `&maturity=${encodeURIComponent(v)}`);
        if(filters.agency) filters.agency.forEach(v => url += `&agency=${encodeURIComponent(v)}`);

        const response = await fetch(url);
        if (!response.ok) throw new Error("API Offline");
        
        const bonds = await response.json();
        renderBonds(bonds, container);
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="no-results" style="text-align:center; color:red; padding:20px; border:1px solid red; border-radius:5px;">
                <i class="fas fa-exclamation-triangle"></i> 
                <strong>System Offline</strong><br>
                Could not connect to BondVault Server.<br>
                <small>Please ensure backend/app.py is running.</small>
            </div>`;
    }
}

function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderBonds(bonds, container) {
    container.innerHTML = '';
    
    if (bonds.length === 0) {
        container.innerHTML = '<div class="no-results">No bonds found matching your criteria.</div>';
        return;
    }

    bonds.forEach(bond => {
        const card = document.createElement('div');
        card.className = 'detailed-bond-card';
        // Use existing CSS classes
        card.innerHTML = `
            <div class="card-header">
                <h3>${escapeHtml(bond.name || bond.issuer_name || 'Unknown Issuer')} <span style="font-size:0.7em; font-weight:normal; color:#666; background:#f0f0f0; padding:2px 6px; border-radius:4px; margin-left:5px;">${escapeHtml(bond.issuer_type || 'N/A')}</span></h3>
                <span style="font-size: 0.8em; color: #666;">${escapeHtml(bond.isin)} <i class="fas fa-copy" style="cursor:pointer; margin-left:5px; color:#007f3f;" onclick="copyToClipboard('${escapeHtml(bond.isin)}')" title="Copy ISIN"></i></span>
            </div>
            <div class="bond-attributes">
                <div class="bond-attribute">Credit Rating <span>${escapeHtml(bond.rating || bond.credit_rating || '-')}</span></div>
                <div class="bond-attribute">Coupon Rate <span>${escapeHtml(bond.coupon || bond.coupon_rate || '-')}</span></div>
                <div class="bond-attribute">Issue Date <span>${escapeHtml(bond.allotment_date || bond.issue_date || '-')}</span></div>
                <div class="bond-attribute">Maturity Date <span>${escapeHtml(bond.maturity || bond.maturity_date || '-')}</span></div>
                <div class="bond-attribute">Face Value <span>${escapeHtml(bond.face_value || '-')}</span></div>
                <div class="bond-attribute">Issue Size <span>${escapeHtml(bond.issue_size || '-')}</span></div>
            </div>
            <button class="view-more-btn" onclick="openDetails(this)" 
                data-id="${bond.id}" 
                data-bond='${JSON.stringify(bond).replace(/'/g, "&#39;")}'>
                View Details
            </button>
        `;
        container.appendChild(card);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("ISIN copied to clipboard: " + text);
    });
}

// --- Modal Logic ---
function openDetails(btnElement) {
    // PERFORMANCE: Read data directly from the button attribute to avoid global array lookups
    const bondData = btnElement.getAttribute('data-bond');
    if(!bondData) return;
    
    const bond = JSON.parse(bondData);

    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsModalTitle');
    const body = document.querySelector('.details-modal-body');
    
    if(modal && title && body) {
        title.innerText = bond.name; // innerText is safe
        body.innerHTML = `
            <div class="detail-row"><span class="detail-label">ISIN:</span> <span class="detail-value">${escapeHtml(bond.isin)} <i class="fas fa-copy" style="cursor:pointer; margin-left:5px; color:#007f3f;" onclick="copyToClipboard('${escapeHtml(bond.isin)}')" title="Copy ISIN"></i></span></div>
            <div class="detail-row"><span class="detail-label">Coupon Rate:</span> <span class="detail-value">${escapeHtml(bond.coupon)}</span></div>
            <div class="detail-row"><span class="detail-label">Credit Rating:</span> <span class="detail-value">${escapeHtml(bond.rating)}</span></div>
            <div class="detail-row"><span class="detail-label">Maturity Date:</span> <span class="detail-value">${escapeHtml(bond.maturity)}</span></div>
            <div class="detail-row"><span class="detail-label">Face Value:</span> <span class="detail-value">${escapeHtml(bond.face_value || '₹1,000')}</span></div>
            <div class="detail-row"><span class="detail-label">Payment Freq:</span> <span class="detail-value">${escapeHtml(bond.payment_freq || 'Annual')}</span></div>
            <div class="detail-row"><span class="detail-label">Tax Status:</span> <span class="detail-value">${escapeHtml(bond.tax_status || 'Taxable')}</span></div>
        `;
        modal.style.display = "block";
        
        const closeBtn = document.querySelector('.details-close-btn');
        if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => { if(e.target == modal) modal.style.display = "none"; }
    }
}

function setupContactModal() {
    const modal = document.getElementById("contactModal");
    // FIX: Select ALL contact buttons (header, footer, etc.) using class and ID
    const openBtns = document.querySelectorAll(".contact-btn, #openContactModal");
    const closeBtn = document.querySelector("#contactModal .close-btn");
    const contactForm = document.getElementById("contactForm");
    const legalCheckbox = document.getElementById('legalCheck');

    if (modal && openBtns.length > 0 && closeBtn && contactForm) {
        openBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.style.display = "block";
            });
        });
        closeBtn.addEventListener('click', () => modal.style.display = "none");
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = "none";
        });
        
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // FIX: Check if checkbox exists before checking checked status
            if (legalCheckbox && !legalCheckbox.checked) {
                alert('You must agree to the Terms of Use.');
                return;
            }
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                mobile: document.getElementById('mobile').value,
                message: document.getElementById('message').value
            };

            try {
                const response = await fetch(`${API_DOMAIN}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                if(response.ok) {
                    alert('Message sent successfully! We will contact you shortly.'); 
                    contactForm.reset(); 
                    modal.style.display = "none";
                } else {
                    alert('Failed to send message. Please try again.');
                }
            } catch (error) {
                console.error(error);
                alert('System Offline. Please try again later.');
            }
        });
    }
}
