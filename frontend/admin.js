// ==================================================
// ADMIN TOKEN (PERSISTENT STORAGE)
// ==================================================
let token = localStorage.getItem("bv_admin_token");

// ==================================================
// ADMIN LOGIN FUNCTION (NO UI CHANGE)
// ==================================================
async function adminLogin(username, password) {
  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Admin login failed");
      return;
    }

    localStorage.setItem("bv_admin_token", data.token);
    token = data.token;
    window.location.reload();

  } catch (err) {
    alert("Server error. Try again.");
  }
}

// ==================================================
// AUTHENTICATED FETCH WRAPPER
// ==================================================
function authFetch(url, options = {}) {
  if (!token) {
    window.location.reload();
    return;
  }

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
}

// ==================================================
// AUTO AUTH CHECK ON PAGE LOAD
// ==================================================
document.addEventListener("DOMContentLoaded", async () => {
  if (!token) return;

  try {
    const res = await authFetch("/admin/dashboard");

    if (!res || res.status === 401 || res.status === 403) {
      localStorage.removeItem("bv_admin_token");
      window.location.reload();
    }
  } catch (err) {
    localStorage.removeItem("bv_admin_token");
    window.location.reload();
  }
});

// ==================================================
// LOGOUT FUNCTION (UNCHANGED FLOW)
// ==================================================
function adminLogout() {
  localStorage.removeItem("bv_admin_token");
  window.location.reload();
}
