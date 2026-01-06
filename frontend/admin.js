/**
 * BondVault Admin Logic
 * Extracted for CSP Compliance and Security
 */

// CONFIGURATION
// If your Render app has a different name, update the URL below.
const API_BASE = (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || window.location.protocol === "file:")
    ? "http://127.0.0.1:5000" : "https://bondvault-api.onrender.com";
const API = `${API_BASE}/api/bonds`;

let AUTH_TOKEN = sessionStorage.getItem('bv_admin_token');
let marketData = [];
let editingBondId = null;
let currentPage = 1;
let itemsPerPage = 50;
let inactivityTimer;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Attach Global Event Listeners (Delegation)
    attachGlobalListeners();

    // 2. Health Check
    checkServerStatus();

    // 3. Session Check
    if (AUTH_TOKEN) verifySession();

    // 4. Inactivity Timer
    resetTimer();
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
});

function attachGlobalListeners() {
    // Login Button (Outside Template)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', authenticate);

    // Global Delegation for Admin Panel
    document.body.addEventListener('click', (e) => {
        // Handle clicks on icons inside buttons
        const target = e.target.closest('button') || e.target.closest('.close-modal-btn');
        if (!target) return;

        // Static Buttons (IDs)
        switch (target.id) {
            case 'logoutBtn': logout(); break;
            case 'viewInquiriesBtn': openInquiries(); break;
            case 'deployBtn': deploy(); break;
            case 'cancelBtn': cancelEdit(); break;
            case 'uploadBtn': uploadCSV(); break;
            case 'templateBtn': downloadTemplate(); break;
            case 'backupBtn': downloadBackup(); break;
            case 'updatePassBtn': changePassword(); break;
            case 'deleteDataBtn': deleteAllData(); break;
            case 'searchBtn': searchAdmin(); break;
            case 'prevPageBtn': changePage(-1); break;
            case 'nextPageBtn': changePage(1); break;
            case 'refreshMsgsBtn': loadMessages(); break;
            case 'exportMsgsBtn': exportMessages(); break;
        }

        // Dynamic Buttons (Data Attributes)
        if (target.dataset.action) {
            const id = target.dataset.id;
            if (target.dataset.action === 'view') viewBond(id);
            if (target.dataset.action === 'edit') editBond(id);
            if (target.dataset.action === 'delete') del(id);
            if (target.dataset.action === 'delete-msg') deleteMessage(id);
        }

        // Modal Close Buttons
        if (target.classList.contains('close-modal-btn')) {
            const modalId = target.dataset.target;
            document.getElementById(modalId).style.display = 'none';
        }
    });

    // Search Input Debounce
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'adminSearch') debouncedAdminSearch();
    });

    // Pagination Change
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'rowsPerPage') changeLimit();
        if (e.target.id === 'pageInput') jumpToPage();
    });
}

// --- CORE FUNCTIONS ---

function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (AUTH_TOKEN) {
            alert("Session expired due to inactivity.");
            logout();
        }
    }, 15 * 60 * 1000);
}

async function checkServerStatus() {
    try {
        const r = await fetch(`${API_BASE}/api/health`);
        if (!r.ok) throw new Error("Server Error");
    } catch (e) {
        // Silent fail on health check, login will show error if needed
    }
}

async function verifySession() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/verify`, { headers: { 'Authorization': AUTH_TOKEN } });
        if (response.ok) renderAdminPanel();
        else throw new Error("Expired");
    } catch (e) { logout(); }
}

async function authenticate() {
    const key = document.getElementById('adminKey').value;
    if (!key) return;

    const tempToken = "Bearer " + btoa(key);
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    loginError.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/api/admin/verify`, { headers: { 'Authorization': tempToken } });
        if (response.ok) {
            AUTH_TOKEN = tempToken;
            sessionStorage.setItem('bv_admin_token', AUTH_TOKEN);
            renderAdminPanel();
        } else {
            loginError.style.display = 'block';
            loginError.innerText = "Invalid Admin Key";
            loginBtn.innerHTML = 'Login';
        }
    } catch (e) {
        console.error(e);
        loginError.style.display = 'block';
        loginError.innerHTML = `Connection Failed.<br><small>Ensure Backend is running on Port 5000.</small>`;
        loginBtn.innerHTML = 'Login';
    }
}

function logout() {
    sessionStorage.removeItem('bv_admin_token');
    location.reload();
}

function renderAdminPanel() {
    const template = document.getElementById('admin-template');
    const clone = template.content.cloneNode(true);
    document.getElementById('admin-root').innerHTML = '';
    document.getElementById('admin-root').appendChild(clone);
    document.getElementById('login-overlay').style.display = 'none';
    refresh();
    updateTotalCount();
}

// --- DATA OPERATIONS ---

async function refresh(searchQuery = '') {
    try {
        let url = `${API}?limit=${itemsPerPage}&page=${currentPage}&_t=${Date.now()}`;
        if (searchQuery) url += "&search=" + encodeURIComponent(searchQuery);

        const r = await fetch(url, { headers: { 'Authorization': AUTH_TOKEN } });
        const d = await r.json();
        marketData = d;

        const stat = document.getElementById('stat');
        if (stat) {
            stat.innerText = "● LIVE";
            stat.className = "status-badge status-live";
        }

        // RENDER TABLE with Data Attributes for Delegation
        if (d.length === 0) {
            document.getElementById('tbl-body').innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#666;">No records found.</td></tr>';
        } else {
            document.getElementById('tbl-body').innerHTML = d.map(x => `
                <tr>
                    <td><strong>${escapeHtml(x.issuer_name)}</strong><br><span style="font-size:0.8em; color:#666">${escapeHtml(x.credit_rating)}</span></td>
                    <td>${escapeHtml(x.isin || 'N/A')}</td>
                    <td>
                        <button class="view-btn" data-action="view" data-id="${x.id}"><i class="fas fa-eye"></i> View</button>
                        <button class="edit-btn" data-action="edit" data-id="${x.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-btn" data-action="delete" data-id="${x.id}"><i class="fas fa-trash"></i> Remove</button>
                    </td>
                </tr>
            `).join('');
        }

        const pageInput = document.getElementById('pageInput');
        if (pageInput) pageInput.value = currentPage;

    } catch (e) { console.error(e); }
}

async function deploy() {
    const ids = ['issuer_name', 'issuer_ownership_type', 'instrument_type', 'credit_rating', 'coupon_rate_pct', 'coupon_type', 'payment_frequency', 'tenor', 'redemption_date', 'face_value_inr', 'isin', 'issuance_mode', 'issue_category', 'issue_size_inr', 'allotment_date'];
    const b = {};
    ids.forEach(id => b[id] = document.getElementById(id).value);

    if (!b.issuer_name || !b.isin) { alert("Issuer Name and ISIN are required."); return; }

    const url = editingBondId ? `${API}/${editingBondId}` : API;
    const method = editingBondId ? 'PUT' : 'POST';

    const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_TOKEN },
        body: JSON.stringify(b)
    });

    if (response.ok) {
        cancelEdit();
        refresh();
        updateTotalCount();
        alert(editingBondId ? "✅ Record Updated Successfully!" : "✅ Data Published Successfully!");
    } else {
        alert("Operation Failed.");
    }
}

function editBond(id) {
    const bond = marketData.find(b => b.id === id);
    if (!bond) return;
    editingBondId = id;

    Object.keys(bond).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = bond[key];
    });

    document.getElementById('form-title').innerText = "Edit Data Record";
    document.getElementById('deployBtn').innerHTML = '<i class="fas fa-save"></i> UPDATE RECORD';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    editingBondId = null;
    document.querySelectorAll('.input-grid input').forEach(i => i.value = '');
    document.getElementById('form-title').innerText = "Publish Educational Bond Data";
    document.getElementById('deployBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> PUBLISH TO DATABASE';
    document.getElementById('cancelBtn').style.display = 'none';
}

async function del(id) {
    if (confirm("Delete this record?")) {
        await fetch(`${API}/${id}`, { method: 'DELETE', headers: { 'Authorization': AUTH_TOKEN } });
        refresh();
        updateTotalCount();
    }
}

function viewBond(id) {
    const bond = marketData.find(b => b.id === id);
    if (!bond) return;

    const fields = [
        { label: "Issuer Name", val: bond.issuer_name },
        { label: "ISIN", val: bond.isin },
        { label: "Credit Rating", val: bond.credit_rating },
        { label: "Coupon Rate", val: bond.coupon_rate_pct },
        { label: "Face Value", val: bond.face_value_inr }
    ];

    const content = fields.map(f => `
        <div class="input-group">
            <label>${f.label}</label>
            <input type="text" value="${escapeHtml(f.val || 'N/A')}" readonly style="background: #f9f9f9;">
        </div>
    `).join('');

    document.getElementById('bond-details-grid').innerHTML = content;
    document.getElementById('bond-details-modal').style.display = 'block';
}

// --- UTILS ---
let searchTimeout;
function debouncedAdminSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchAdmin, 500);
}
function searchAdmin() {
    currentPage = 1;
    refresh(document.getElementById('adminSearch').value);
}
function changePage(delta) {
    if (currentPage + delta < 1) return;
    currentPage += delta;
    refresh(document.getElementById('adminSearch').value);
}
function jumpToPage() {
    const p = parseInt(document.getElementById('pageInput').value);
    if (p >= 1) {
        currentPage = p;
        refresh(document.getElementById('adminSearch').value);
    }
}
function changeLimit() {
    itemsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    refresh(document.getElementById('adminSearch').value);
}

async function updateTotalCount() {
    try {
        const r = await fetch(`${API_BASE}/api/admin/stats?_t=${Date.now()}`, { headers: { 'Authorization': AUTH_TOKEN } });
        if (r.ok) {
            const d = await r.json();
            const el = document.getElementById('total-bonds-count');
            if (el) el.innerText = `(${d.bond_count} Total)`;
        }
    } catch (e) { }
}

// --- BULK & MESSAGES ---
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    if (fileInput.files.length === 0) { alert("Select CSV"); return; }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const r = await fetch(API + "/upload", { method: 'POST', headers: { 'Authorization': AUTH_TOKEN }, body: formData });
        const res = await r.json();
        if(r.ok) { alert(res.message); refresh(); } else alert(res.error);
    } catch(e) { alert("Upload Failed"); }
}

function downloadTemplate() {
    const headers = "isin,issuer_name,instrument_type,issuance_mode,issue_category,face_value_inr,issue_size_inr,allotment_date,tenor,redemption_date,coupon_rate_pct,coupon_type,payment_frequency,credit_rating,issuer_ownership_type";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "template.csv"; document.body.appendChild(a); a.click(); a.remove();
}

async function downloadBackup() {
    const r = await fetch(`${API_BASE}/api/bonds/export`, { headers: { 'Authorization': AUTH_TOKEN } });
    if(r.ok) {
        const blob = await r.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = "backup.csv"; document.body.appendChild(a); a.click(); a.remove();
    }
}

async function changePassword() {
    const p = document.getElementById('newAdminPass').value;
    if(!p) return;
    
    const r = await fetch(`${API_BASE}/api/admin/password`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_TOKEN }, body: JSON.stringify({ new_password: p }) });
    const res = await r.json();
    
    if(!r.ok) alert(res.error);
    else { alert("Password changed. Logging out."); logout(); }
}

async function deleteAllData() {
    if(!confirm("ERASE ALL DATA?")) return;
    const p = prompt("Confirm with Password:");
    if(!p) return;
    const r = await fetch(`${API_BASE}/api/admin/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_TOKEN }, body: JSON.stringify({ password: p }) });
    if(r.ok) { alert("Reset Complete"); refresh(); } else alert("Failed");
}

function openInquiries() {
    document.getElementById('inquiries-modal').style.display = 'block';
    loadMessages();
}

async function loadMessages() {
    const r = await fetch(`${API_BASE}/api/admin/messages`, { headers: { 'Authorization': AUTH_TOKEN } });
    const msgs = await r.json();
    document.getElementById('messages-body').innerHTML = msgs.map(m => `
        <tr>
            <td>${escapeHtml(m.timestamp)}</td>
            <td>${escapeHtml(m.name)}<br>${escapeHtml(m.email)}</td>
            <td>${escapeHtml(m.message)}</td>
            <td><button class="delete-btn" data-action="delete-msg" data-id="${m.id}">Del</button></td>
        </tr>
    `).join('');
}

async function deleteMessage(id) {
    if(confirm("Delete msg?")) {
        await fetch(`${API_BASE}/api/admin/messages/${id}`, { method: 'DELETE', headers: { 'Authorization': AUTH_TOKEN } });
        loadMessages();
    }
}

async function exportMessages() {
    const r = await fetch(`${API_BASE}/api/admin/messages/export`, { headers: { 'Authorization': AUTH_TOKEN } });
    if(r.ok) {
        const blob = await r.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = "inquiries.csv"; document.body.appendChild(a); a.click(); a.remove();
    }
}