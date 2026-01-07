/**
 * BondVault Admin Logic
 * STABLE + RENDER DEPLOYMENT FIXED
 */

/* ================= CONFIG ================= */

const API_BASE = "https://mywebsite-iopi.onrender.com";
const API_BONDS = `${API_BASE}/api/bonds`;
const API_VERIFY = `${API_BASE}/api/admin/verify`;
const API_HEALTH = `${API_BASE}/api/health`;

let AUTH_TOKEN = sessionStorage.getItem("bv_admin_token");
let marketData = [];
let currentPage = 1;
let itemsPerPage = 50;
let inactivityTimer;

/* ================= INIT ================= */

documentdocument.addEventListener("DOMContentLoaded", () => {
    checkServerStatus();

    if (AUTH_TOKEN) {
        verifySession();
    }

    setupGlobalEvents();
    resetTimer();
});

/* ================= EVENTS ================= */

function setupGlobalEvents() {
    document.body.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        if (btn.id === "loginBtn") authenticate();
        if (btn.id === "logoutBtn") logout();

        if (btn.dataset.action === "view") viewBond(btn.dataset.id);
        if (btn.dataset.action === "edit") editBond(btn.dataset.id);
        if (btn.dataset.action === "delete") deleteBond(btn.dataset.id);

        if (btn.id === "searchBtn") searchAdmin();
        if (btn.id === "prevPageBtn") changePage(-1);
        if (btn.id === "nextPageBtn") changePage(1);
    });

    document.addEventListener("mousemove", resetTimer);
    document.addEventListener("keypress", resetTimer);
}

/* ================= HELPERS ================= */

function escapeHtml(text) {
    return text == null ? "" : String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (AUTH_TOKEN) {
            alert("Session expired");
            logout();
        }
    }, 15 * 60 * 1000);
}

/* ================= SERVER ================= */

async function checkServerStatus() {
    try {
        const r = await fetch(API_HEALTH);
        if (r.ok) {
            const stat = document.getElementById("stat");
            if (stat) {
                stat.textContent = "● LIVE";
                stat.className = "status-badge status-live";
            }
        }
    } catch {}
}

async function verifySession() {
    try {
        const r = await fetch(API_VERIFY, {
            headers: { Authorization: AUTH_TOKEN }
        });
        if (r.ok) renderAdminPanel();
        else logout();
    } catch {
        logout();
    }
}

/* ================= AUTH ================= */

async function authenticate() {
    const keyInput = document.getElementById("adminKey");
    const errorBox = document.getElementById("loginError");

    if (!keyInput || !keyInput.value) return;

    const token = "Bearer " + btoa(keyInput.value.trim());

    try {
        const r = await fetch(API_VERIFY, {
            headers: { Authorization: token }
        });

        if (!r.ok) throw new Error();

        AUTH_TOKEN = token;
        sessionStorage.setItem("bv_admin_token", token);
        renderAdminPanel();

    } catch {
        if (errorBox) errorBox.style.display = "block";
    }
}

function logout() {
    sessionStorage.removeItem("bv_admin_token");
    location.reload();
}

/* ================= UI ================= */

function renderAdminPanel() {
    const tpl = document.getElementById("admin-template");
    const root = document.getElementById("admin-root");
    if (!tpl || !root) return;

    root.innerHTML = "";
    root.appendChild(tpl.content.cloneNode(true));

    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.style.display = "none";

    loadBonds();
}

/* ================= DATA ================= */

async function loadBonds(search = "") {
    try {
        let url = `${API_BONDS}?page=${currentPage}&limit=${itemsPerPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const r = await fetch(url, {
            headers: { Authorization: AUTH_TOKEN }
        });

        if (!r.ok) throw new Error();

        const data = await r.json();
        marketData = Array.isArray(data) ? data : [];

        renderTable();
    } catch {
        renderError("Backend not reachable");
    }
}

function renderTable() {
    const tbody = document.getElementById("tbl-body");
    if (!tbody) return;

    if (marketData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">No data found</td></tr>`;
        return;
    }

    tbody.innerHTML = marketData.map(b => `
        <tr>
            <td>
                <strong>${escapeHtml(b.issuer_name)}</strong><br>
                <small>${escapeHtml(b.credit_rating || "")}</small>
            </td>
            <td>${escapeHtml(b.isin || "N/A")}</td>
            <td>
                <button data-action="view" data-id="${b.id}">View</button>
                <button data-action="edit" data-id="${b.id}">Edit</button>
                <button data-action="delete" data-id="${b.id}">Delete</button>
            </td>
        </tr>
    `).join("");
}

function renderError(msg) {
    const tbody = document.getElementById("tbl-body");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center">${msg}</td></tr>`;
    }
}

/* ================= CRUD ================= */

function editBond(id) {
    const bond = marketData.find(b => String(b.id) === String(id));
    if (!bond) return;

    Object.keys(bond).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.value = bond[k];
    });
}

async function deleteBond(id) {
    if (!confirm("Delete this bond?")) return;

    await fetch(`${API_BONDS}/${id}`, {
        method: "DELETE",
        headers: { Authorization: AUTH_TOKEN }
    });

    loadBonds();
}

function viewBond(id) {
    const bond = marketData.find(b => String(b.id) === String(id));
    if (!bond) return;

    alert(
        `Issuer: ${bond.issuer_name}\nISIN: ${bond.isin}\nRating: ${bond.credit_rating || "N/A"}`
    );
}

/* ================= SEARCH + PAGINATION ================= */

function searchAdmin() {
    currentPage = 1;
    const q = document.getElementById("adminSearch")?.value || "";
    loadBonds(q);
}

function changePage(delta) {
    currentPage = Math.max(1, currentPage + delta);
    searchAdmin();
}
