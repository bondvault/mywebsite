/**
 * BondVault Admin Logic
 * FINAL – RENDER COMPATIBLE – NO AUTH HEADER BUGS
 */

/* ================= CONFIG ================= */

const API_BASE = "https://mywebsite-iopi.onrender.com";
const API_BONDS = `${API_BASE}/api/bonds`;
const API_VERIFY = `${API_BASE}/api/admin/verify`;
const API_HEALTH = `${API_BASE}/api/health`;

let AUTH_KEY = sessionStorage.getItem("bv_admin_key");
let marketData = [];
let currentPage = 1;
let itemsPerPage = 50;
let inactivityTimer;

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    checkServerStatus();

    if (AUTH_KEY) {
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

    ["mousemove", "keypress", "touchstart"].forEach(ev =>
        document.addEventListener(ev, resetTimer)
    );
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
        if (AUTH_KEY) {
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

/* ================= AUTH ================= */

async function authenticate() {
    const key = document.getElementById("adminKey").value.trim();
    const err = document.getElementById("loginError");

    if (!key) return;

    try {
        const r = await fetch(API_VERIFY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_key: key })
        });

        if (!r.ok) throw new Error();

        AUTH_KEY = key;
        sessionStorage.setItem("bv_admin_key", key);
        renderAdminPanel();

    } catch {
        err.style.display = "block";
    }
}

async function verifySession() {
    if (!AUTH_KEY) return;

    try {
        const r = await fetch(API_VERIFY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_key: AUTH_KEY })
        });

        if (r.ok) renderAdminPanel();
        else logout();
    } catch {
        logout();
    }
}

function logout() {
    sessionStorage.removeItem("bv_admin_key");
    AUTH_KEY = null;
    marketData = [];
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

        const r = await fetch(url);
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

    if (!marketData.length) {
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
        tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center">${escapeHtml(msg)}</td></tr>`;
    }
}

/* ================= CRUD ================= */

function editBond(id) {
    const bond = marketData.find(b => String(b.id) === String(id));
    if (!bond) return;

    Object.keys(bond).forEach(k => {
        const el = document.getElementById(k);
        if (el && "value" in el) el.value = bond[k];
    });
}

async function deleteBond(id) {
    if (!confirm("Delete this bond?")) return;

    try {
        const r = await fetch(`${API_BONDS}/${id}`, { method: "DELETE" });
        if (!r.ok) throw new Error();
        loadBonds();
    } catch {
        renderError("Delete failed");
    }
}

function viewBond(id) {
    const b = marketData.find(x => String(x.id) === String(id));
    if (!b) return;

    alert(
        `Issuer: ${b.issuer_name}\nISIN: ${b.isin}\nRating: ${b.credit_rating || "N/A"}`
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
