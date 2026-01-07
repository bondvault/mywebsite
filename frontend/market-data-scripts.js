// frontend/market-data-scripts.js

const API_DOMAIN =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://bondvault-api.onrender.com";

const API_URL = `${API_DOMAIN}/api/bonds`;

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("bonds-container");

  if (container) {
    const isHome =
      window.location.pathname.endsWith("/") ||
      window.location.pathname.includes("index.html");

    fetchBonds(container, "", isHome ? 3 : 50);
  }

  const searchBtn = document.querySelector(".search-btn");
  const searchInput = document.getElementById("bonds-search");

  if (searchBtn && searchInput) {
    searchBtn.onclick = () =>
      fetchBonds(container, searchInput.value, 50);

    searchInput.onkeyup = (e) => {
      if (e.key === "Enter")
        fetchBonds(container, searchInput.value, 50);
    };
  }
});

async function fetchBonds(container, search = "", limit = 50) {
  try {
    container.innerHTML =
      '<p style="text-align:center">Loading bonds...</p>';

    let url = `${API_URL}?limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("API Error");

    const bonds = await res.json();
    renderBonds(bonds, container);
  } catch (e) {
    container.innerHTML =
      "<p style='color:red;text-align:center'>Server not reachable</p>";
  }
}

function renderBonds(bonds, container) {
  container.innerHTML = "";

  if (!bonds || bonds.length === 0) {
    container.innerHTML =
      "<p style='text-align:center'>No bonds found</p>";
    return;
  }

  bonds.forEach((bond) => {
    const div = document.createElement("div");
    div.className = "detailed-bond-card";

    div.innerHTML = `
      <h3>${bond.issuer_name}</h3>
      <p><b>ISIN:</b> ${bond.isin}</p>
      <p><b>Credit Rating:</b> ${bond.credit_rating || "-"}</p>
      <p><b>Coupon Rate:</b> ${bond.coupon_rate_pct || "-"}%</p>
      <p><b>Allotment Date:</b> ${bond.allotment_date || "-"}</p>
      <p><b>Maturity Date:</b> ${bond.redemption_date || "-"}</p>
      <p><b>Face Value:</b> ₹${bond.face_value_inr || "-"}</p>
      <p><b>Issue Size:</b> ₹${bond.issue_size_inr || "-"}</p>
    `;

    container.appendChild(div);
  });
}
