/**
 * BondVault Admin Logic
 * ✅ FULLY MATCHES FLASK app.py
 * ✅ BASE64 AUTH FIXED
 * ✅ RENDER DEPLOYMENT READY
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

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    checkServerStatus();
    if (AUTH_TOKEN) verifySession();
    bindEvents();
});

/* ================= EVENTS ================= */

function bindEvents() {
    document.getElementById("loginBtn")?.addEventListener("click", authenticate);
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
    } catch (e) {
        console.log("Health check failed");
    }
}

/* ================= AUTH ================= */

async function authenticate() {
    const keyInput = document.getElementById("adminKey");
    const errorBox = document.getElementById("loginError");
    errorBox.style.display = "none";

    if (!keyInput || !keyInput.value.trim()) return;

    // ✅ BASE64 ENCODING (REQUIRED BY BACKEND)
    const encodedKey = btoa(keyInput.value.trim());
    const token = `Bearer ${encodedKey}`;

    try {
        const r = await fetch(API_VERIFY, {
            headers: { Authorization: token }
        });

        if (!r.ok) throw new Error("Invalid Key");

        AUTH_TOKEN = token;
        sessionStorage.setItem("bv_admin_token", token);
        loadAdminUI();

    } catch {
        errorBox.style.display = "block";
    }
}

async function verifySession() {
    try {
        const r = await fetch(API_VERIFY, {
            headers: { Authorization: AUTH_TOKEN }
        });

        if (r.ok) {
            loadAdminUI();
        } else {
            logout();
        }
    } catch {
        logout();
    }
}

function logout() {
    sessionStorage.removeItem("bv_admin_token");
    location.reload();
}

/* ================= UI ================= */

function loadAdminUI() {
    const overlay = document.getElementById("login-overlay");
    const root = document.getElementById("admin-root");
    const template = document.getElementById("admin-template");

    if (overlay) overlay.style.display = "none";
    root.innerHTML = "";
    root.appendChild(template.content.cloneNode(true));

    loadBonds();
}

/* ================= DATA ================= */

async function loadBonds() {
    try {
        const r = await fetch(`${API_BONDS}?page=${currentPage}&limit=${itemsPerPage}`, {
            headers: { Authorization: AUTH_TOKEN }
        });

        if (!r.ok) throw new Error("Failed");

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
        tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
        return;
    }

    tbody.innerHTML = marketData.map(b => `
        <tr>
            <td>
                <strong>${b.issuer_name || ""}</strong><br>
                <small>${b.credit_rating || ""}</small>
            </td>
            <td>${b.isin || "N/A"}</td>
            <td>OK</td>
        </tr>
    `).join("");
}

function renderError(msg) {
    const tbody = document.getElementById("tbl-body");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:red">${msg}</td></tr>`;
    }
}
