/**
 * BondVault Admin Logic
 * FINAL – PERFECT MATCH WITH FLASK BACKEND
 */

const API_BASE = "https://mywebsite-iopi.onrender.com";
const API_BONDS = `${API_BASE}/api/bonds`;
const API_VERIFY = `${API_BASE}/api/admin/verify`;
const API_HEALTH = `${API_BASE}/api/health`;

let AUTH_TOKEN = sessionStorage.getItem("bv_admin_token");
let marketData = [];

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
    checkServerStatus();
    if (AUTH_TOKEN) verifySession();
    document.getElementById("loginBtn").addEventListener("click", authenticate);
});

/* SERVER STATUS */
async function checkServerStatus() {
    try {
        const r = await fetch(API_HEALTH);
        if (r.ok) {
            const s = document.getElementById("stat");
            if (s) {
                s.textContent = "● LIVE";
                s.className = "status-badge status-live";
            }
        }
    } catch {}
}

/* AUTH */
async function authenticate() {
    const key = document.getElementById("adminKey").value.trim();
    const err = document.getElementById("loginError");
    err.style.display = "none";

    if (!key) return;

    const token = "Bearer " + btoa(key);

    try {
        const r = await fetch(API_VERIFY, {
            headers: { Authorization: token }
        });

        if (!r.ok) throw new Error();

        AUTH_TOKEN = token;
        sessionStorage.setItem("bv_admin_token", token);
        loadAdminUI();

    } catch {
        err.style.display = "block";
    }
}

async function verifySession() {
    try {
        const r = await fetch(API_VERIFY, {
            headers: { Authorization: AUTH_TOKEN }
        });
        if (r.ok) loadAdminUI();
        else logout();
    } catch {
        logout();
    }
}

function logout() {
    sessionStorage.removeItem("bv_admin_token");
    location.reload();
}

/* UI */
function loadAdminUI() {
    document.getElementById("login-overlay").style.display = "none";
    const root = document.getElementById("admin-root");
    root.innerHTML = "";
    root.appendChild(
        document.getElementById("admin-template").content.cloneNode(true)
    );
    loadBonds();
}

/* DATA */
async function loadBonds() {
    try {
        const r = await fetch(API_BONDS, {
            headers: { Authorization: AUTH_TOKEN }
        });
        const data = await r.json();
        marketData = Array.isArray(data) ? data : [];
        renderTable();
    } catch {
        renderError("Backend not reachable");
    }
}

function renderTable() {
    const body = document.getElementById("tbl-body");
    body.innerHTML = marketData.length
        ? marketData.map(b => `
            <tr>
                <td>${b.issuer_name || ""}</td>
                <td>${b.isin || ""}</td>
                <td>OK</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No data</td></tr>`;
}

function renderError(msg) {
    document.getElementById("tbl-body").innerHTML =
        `<tr><td colspan="3" style="color:red">${msg}</td></tr>`;
}
