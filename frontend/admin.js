/**
 * BondVault Admin Logic
 * FIXED LOGIN + RENDER DEPLOYMENT VERSION
 */

/* ================= CONFIG ================= */

const API_BASE =
    "https://mywebsite-iopi.onrender.com";

const API = `${API_BASE}/api/bonds`;

let AUTH_TOKEN = sessionStorage.getItem("bv_admin_token");
let marketData = [];
let editingBondId = null;
let currentPage = 1;
let itemsPerPage = 50;
let inactivityTimer;

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    checkServerStatus();
    if (AUTH_TOKEN) verifySession();
    resetTimer();
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
});

/* ================= GLOBAL CLICK FIX (CRITICAL) ================= */

document.addEventListener("click", (e) => {

    if (e.target && e.target.id === "loginBtn") {
        authenticate();
    }

    if (e.target && e.target.id === "logoutBtn") {
        logout();
    }

    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.action === "view") viewBond(btn.dataset.id);
    if (btn.dataset.action === "edit") editBond(btn.dataset.id);
    if (btn.dataset.action === "delete") del(btn.dataset.id);

    if (btn.id === "searchBtn") searchAdmin();
    if (btn.id === "prevPageBtn") changePage(-1);
    if (btn.id === "nextPageBtn") changePage(1);
});

/* ================= HELPERS ================= */

function escapeHtml(text) {
    if (text == null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (AUTH_TOKEN) {
            alert("Session expired.");
            logout();
        }
    }, 15 * 60 * 1000);
}

/* ================= SERVER ================= */

async function checkServerStatus() {
    try {
        const r = await fetch(`${API_BASE}/api/health`);
        if (r.ok) {
            const stat = document.getElementById("stat");
            if (stat) {
                stat.textContent = "● LIVE";
                stat.className = "status-badge status-live";
            }
        }
    } catch (_) {}
}

async function verifySession() {
    try {
        const r = await fetch(`${API_BASE}/api/admin/verify`, {
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
    const key = document.getElementById("adminKey")?.value;
    if (!key) return;

    const token = "Bearer " + btoa(key);

    try {
        const r = await fetch(`${API_BASE}/api/admin/verify`, {
            headers: { Authorization: token }
        });

        if (!r.ok) throw new Error();

        AUTH_TOKEN = token;
        sessionStorage.setItem("bv_admin_token", token);
        renderAdminPanel();

    } catch {
        document.getElementById("loginError").style.display = "block";
    }
}

function logout() {
    sessionStorage.removeItem("bv_admin_token");
    location.reload();
}

/* ================= UI ================= */

function renderAdminPanel() {
    const tpl = document.getElementById("admin-template");
    const clone = tpl.content.cloneNode(true);
    const root = document.getElementById("admin-root");
    root.innerHTML = "";
    root.appendChild(clone);
    document.getElementById("login-overlay").style.display = "none";
    refresh();
}

/* ================= DATA ================= */

async function refresh(searchQuery = "") {
    try {
        let url = `${API}?limit=${itemsPerPage}&page=${currentPage}&_t=${Date.now()}`;
        if (searchQuery) url += "&search=" + encodeURIComponent(searchQuery);

        const r = await fetch(url, {
            headers: { Authorization: AUTH_TOKEN }
        });

        if (!r.ok) throw new Error();

        const d = await r.json();
        marketData = Array.isArray(d) ? d : [];

        const tbody = document.getElementById("tbl-body");
        if (!tbody) return;

        if (marketData.length === 0) {
            tbody.innerHTML =
                `<tr><td colspan="3" style="text-align:center;padding:20px;">
                No data found
                </td></tr>`;
            return;
        }

        tbody.innerHTML = marketData.map(x => `
            <tr>
                <td>
                    <strong>${escapeHtml(x.issuer_name)}</strong><br>
                    <small>${escapeHtml(x.credit_rating || "")}</small>
                </td>
                <td>${escapeHtml(x.isin || "N/A")}</td>
                <td>
                    <button data-action="view" data-id="${x.id}">View</button>
                    <button data-action="edit" data-id="${x.id}">Edit</button>
                    <button data-action="delete" data-id="${x.id}">Delete</button>
                </td>
            </tr>
        `).join("");

    } catch {
        document.getElementById("tbl-body").innerHTML =
            `<tr><td colspan="3" style="color:red;text-align:center;">
            Backend not reachable
            </td></tr>`;
    }
}

/* ================= CRUD ================= */

function editBond(id) {
    const bond = marketData.find(b => String(b.id) === String(id));
    if (!bond) return;

    editingBondId = id;
    Object.keys(bond).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.value = bond[k];
    });
}

async function del(id) {
    if (!confirm("Delete record?")) return;
    await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: AUTH_TOKEN }
    });
    refresh();
}

function viewBond(id) {
    const bond = marketData.find(b => String(b.id) === String(id));
    if (!bond) return;
    alert(`Issuer: ${bond.issuer_name}\nISIN: ${bond.isin}`);
}

/* ================= SEARCH ================= */

let searchTimeout;
function debouncedAdminSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchAdmin, 400);
}

function searchAdmin() {
    currentPage = 1;
    refresh(document.getElementById("adminSearch").value);
}

function changePage(delta) {
    currentPage = Math.max(1, currentPage + delta);
    refresh(document.getElementById("adminSearch").value);
}
