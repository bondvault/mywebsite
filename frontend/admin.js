/* ================= API BASE ================= */

const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "https://bondvault-api.onrender.com";

const API_VERIFY = `${API_BASE}/api/admin/verify`;
const API_BONDS = `${API_BASE}/api/bonds`;
const API_HEALTH = `${API_BASE}/api/health`;

/* ================= STATE ================= */

let token = sessionStorage.getItem("bv_admin_token");
let bonds = [];

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();

  document
    .getElementById("admin-login-form")
    ?.addEventListener("submit", login);

  if (token) validateAndLoad();
});

/* ================= HEALTH ================= */

async function checkHealth() {
  try {
    await fetch(API_HEALTH);
  } catch {
    showError("Backend not running");
  }
}

/* ================= AUTH ================= */

async function login(e) {
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
    if (!res.ok) throw new Error();

    token = data.token;
    sessionStorage.setItem("bv_admin_token", token);
    validateAndLoad();
  } catch {
    alert("Invalid login");
  }
}

/* ================= SESSION VALIDATION ================= */

async function validateAndLoad() {
  try {
    const res = await fetch(API_BONDS, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      sessionStorage.removeItem("bv_admin_token");
      token = null;
      return;
    }

    bonds = await res.json();
    render();
  } catch {
    showError("Failed to load admin data");
  }
}

/* ================= UI ================= */

function render() {
  const body = document.getElementById("tbl-body");

  body.innerHTML = bonds.length
    ? bonds
        .map(
          (b) => `
      <tr>
        <td>${b.issuer_name || ""}</td>
        <td>${b.isin || ""}</td>
        <td>OK</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="3">No data</td></tr>`;
}

function showError(msg) {
  document.getElementById("tbl-body").innerHTML =
    `<tr><td colspan="3" style="color:red">${msg}</td></tr>`;
}
