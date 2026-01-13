const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "https://bondvault-api.onrender.com";

fetch(`${API_BASE}/api/bonds`, {
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("bv_admin_token") || ""}`
  }
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
