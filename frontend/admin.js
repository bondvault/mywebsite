/**
 * BondVault Admin Logic
 * FINAL – PERFECT MATCH WITH FLASK BACKEND
 * LOCAL + PROD SAFE
 */

/* ================= API BASE ================= */

const API_BASE =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://mywebsite-iopi.onrender.com";

const API_BONDS = `${API_BASE}/api/bonds`;
const API_VERIFY = `${API_BASE}/api/admin/verify`;
const API_HEALTH = `${API_BASE}/api/health`;

/* ================= STATE ================= */

let AUTH_TOKEN = sessionStorage.getItem("bv_admin_token");
let marketData = [];

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  checkServerStatus();

  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (AUTH_TOKEN) {
    loadBonds();
  }
});

/* ================= SERVER HEALTH ================= */

async function checkServerStatus() {
  try {
    const res = await fetch(API_HEALTH);
    if (!res.ok) throw new Error("Backend not reachable");
  } catch (err) {
    renderError("Backend server is not running");
  }
}

/* ================= AUTH ================= */

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("admin-user").value;
  const password = document.getElementById("admin-pass").value;

  try {
    const res = await fetch(API_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Login failed");
      return;
    }

    AUTH_TOKEN = data.token;
    sessionStorage.setItem("bv_admin_token", AUTH_TOKEN);
    loadBonds();
  } catch (err) {
    alert("Server connection failed");
  }
}

/* ================= DATA ================= */

async function loadBonds() {
  try {
    const res = await fetch(API_BONDS, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`
      }
    });

    if (!res.ok) throw new Error("Unauthorized");

    marketData = await res.json();
    renderTable();
  } catch (err) {
    renderError("Failed to load bonds");
  }
}

/* ================= UI ================= */

function renderTable() {
  const tbody = document.getElementById("tbl-body");

  tbody.innerHTML = marketData.length
    ? marketData
        .map(
          (b) => `
      <tr>
        <td>${b.issuer_name || ""}</td>
        <td>${b.isin || ""}</td>
        <td>OK</td>
      </tr>
    `
        )
        .join("")
    : `<tr><td colspan="3">No data</td></tr>`;
}

function renderError(msg) {
  document.getElementById("tbl-body").innerHTML =
    `<tr><td colspan="3" style="color:red">${msg}</td></tr>`;
}
