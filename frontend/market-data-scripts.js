// c:\Users\Administrator\.vscode\mywebsite\frontend\market-data-scripts.js

// CONFIGURATION
const API_DOMAIN =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost" ||
    window.location.protocol === "file:"
        ? "http://127.0.0.1:5000"
        : "https://bondvault-api.onrender.com";

const API_URL = `${API_DOMAIN}/api/bonds`;

document.addEventListener('DOMContentLoaded', () => {
    setupContactModal();

    const container = document.getElementById('bonds-container');
    if (container) {
        container.innerHTML =
            '<p style="text-align:center; padding:40px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Loading Market Data...</p>';

        const isHome =
            window.location.pathname.includes('index.html') ||
            window.location.pathname.endsWith('/');

        fetchBonds(container, '', isHome ? 3 : 50);
    }

    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('bonds-search');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () =>
            fetchBonds(container, searchInput.value)
        );
        searchInput.addEventListener('keyup', e => {
            if (e.key === 'Enter')
                fetchBonds(container, searchInput.value);
        });
    }

    const applyFilterBtn = document.querySelector('.apply-filters');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const filters = {
                issuer: Array.from(
                    document.querySelectorAll('input[name="issuer"]:checked')
                ).map(cb => cb.value),
                maturity: Array.from(
                    document.querySelectorAll('input[name="maturity"]:checked')
                ).map(cb => cb.value),
                agency: Array.from(
                    document.querySelectorAll('input[name="agency"]:checked')
                ).map(cb => cb.value)
            };
            fetchBonds(container, '', 50, filters);
        });
    }
});

// ---------------- DATA FETCH ----------------

async function fetchBonds(container, searchQuery = '', limit = 50, filters = {}) {
    try {
        if (searchQuery || Object.keys(filters).length > 0) {
            container.innerHTML =
                '<p style="text-align:center; padding:20px;">Searching Vault...</p>';
        }

        let url = `${API_URL}?limit=${limit}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        if (filters.issuer)
            filters.issuer.forEach(v => (url += `&issuer=${encodeURIComponent(v)}`));
        if (filters.maturity)
            filters.maturity.forEach(v => (url += `&maturity=${encodeURIComponent(v)}`));
        if (filters.agency)
            filters.agency.forEach(v => (url += `&agency=${encodeURIComponent(v)}`));

        const response = await fetch(url);
        if (!response.ok) throw new Error("API Offline");

        const bonds = await response.json();
        renderBonds(bonds, container);
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="no-results" style="text-align:center; color:red; padding:20px; border:1px solid red; border-radius:5px;">
                <strong>System Offline</strong><br>
                Could not connect to BondVault Server.
            </div>`;
    }
}

// ---------------- RENDER ----------------

function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderBonds(bonds, container) {
    container.innerHTML = '';

    if (!bonds || bonds.length === 0) {
        container.innerHTML =
            '<div class="no-results">No bonds found matching your criteria.</div>';
        return;
    }

    bonds.forEach(bond => {
        const card = document.createElement('div');
        card.className = 'detailed-bond-card';

        card.innerHTML = `
            <div class="card-header">
                <h3>
                    ${escapeHtml(bond.name || bond.issuer_name || 'Unknown Issuer')}
                    <span style="font-size:0.7em; color:#666;">
                        ${escapeHtml(bond.issuer_type || bond.issuer_ownership_type || 'N/A')}
                    </span>
                </h3>
                <span style="font-size:0.8em;">
                    ${escapeHtml(bond.isin || '')}
                </span>
            </div>

            <div class="bond-attributes">
                <div class="bond-attribute">
                    Credit Rating
                    <span>${escapeHtml(bond.rating || bond.credit_rating || '-')}</span>
                </div>
                <div class="bond-attribute">
                    Coupon Rate
                    <span>${escapeHtml(bond.coupon || bond.coupon_rate_pct || '-')}</span>
                </div>
                <div class="bond-attribute">
                    Issue Date
                    <span>${escapeHtml(bond.allotment_date || '-')}</span>
                </div>
                <div class="bond-attribute">
                    Maturity Date
                    <span>${escapeHtml(bond.maturity || bond.redemption_date || '-')}</span>
                </div>
                <div class="bond-attribute">
                    Face Value
                    <span>${escapeHtml(bond.face_value || bond.face_value_inr || '-')}</span>
                </div>
                <div class="bond-attribute">
                    Issue Size
                    <span>${escapeHtml(bond.issue_size || bond.issue_size_inr || '-')}</span>
                </div>
            </div>

            <button class="view-more-btn"
                onclick="openDetails(this)"
                data-bond='${JSON.stringify(bond).replace(/'/g, "&#39;")}'>
                View Details
            </button>
        `;

        container.appendChild(card);
    });
}

// ---------------- MODAL ----------------

function openDetails(btn) {
    const bond = JSON.parse(btn.getAttribute('data-bond'));
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('detailsModalTitle');
    const body = document.querySelector('.details-modal-body');

    if (!modal) return;

    title.innerText = bond.issuer_name || bond.name || '';
    body.innerHTML = `
        <div><b>ISIN:</b> ${escapeHtml(bond.isin)}</div>
        <div><b>Credit Rating:</b> ${escapeHtml(bond.credit_rating)}</div>
        <div><b>Coupon:</b> ${escapeHtml(bond.coupon_rate_pct)}</div>
        <div><b>Maturity:</b> ${escapeHtml(bond.redemption_date)}</div>
    `;

    modal.style.display = "block";
    window.onclick = e => {
        if (e.target === modal) modal.style.display = "none";
    };
}

// ---------------- CONTACT MODAL ----------------

function setupContactModal() {
    const modal = document.getElementById("contactModal");
    const openBtns = document.querySelectorAll(".contact-btn, #openContactModal");
    const closeBtn = document.querySelector("#contactModal .close-btn");
    const contactForm = document.getElementById("contactForm");

    if (!modal || !contactForm) return;

    openBtns.forEach(btn =>
        btn.addEventListener('click', e => {
            e.preventDefault();
            modal.style.display = "block";
        })
    );

    closeBtn.onclick = () => (modal.style.display = "none");

    contactForm.addEventListener('submit', async e => {
        e.preventDefault();

        const formData = {
            name: name.value,
            email: email.value,
            mobile: mobile.value,
            message: message.value
        };

        await fetch(`${API_DOMAIN}/api/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        alert("Message sent");
        contactForm.reset();
        modal.style.display = "none";
    });
}
