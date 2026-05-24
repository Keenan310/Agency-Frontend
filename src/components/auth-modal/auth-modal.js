window.KeenanFrontend = window.KeenanFrontend || { modules: {} };

(function () {
  const CONFIG = window.KEENAN_CONFIG || {};

  function authBase() {
    return (CONFIG.authBaseUrl || "http://localhost:3000/v1").replace(
      /\/$/,
      "",
    );
  }

  async function apiRequest(endpoint, body = {}) {
    const response = await fetch(`${authBase()}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  function showAlert(message, type = "error") {
    const alertBox = document.getElementById("auth-alert");

    if (!alertBox) return;

    alertBox.style.display = "block";
    alertBox.innerHTML = message;

    alertBox.className = `auth-alert ${type}`;
  }

  function clearAlert() {
    const alertBox = document.getElementById("auth-alert");

    if (!alertBox) return;

    alertBox.style.display = "none";
    alertBox.innerHTML = "";
  }

  window.setAuthMode = function (mode) {
    clearAlert();

    const title = document.getElementById("auth-title");
    const subtitle = document.getElementById("auth-subtitle");
    const submitBtn = document.getElementById("auth-submit");

    const registerRow = document.getElementById("auth-register-row");
    const usernameRow = document.getElementById("auth-username-row");
    const phoneRow = document.getElementById("auth-phone-row");
    const confirmRow = document.getElementById("auth-confirm-row");

    const forgotRow = document.getElementById("auth-forgot-row");
    const backRow = document.getElementById("auth-back-row");

    if (mode === "register") {
      title.textContent = "Create Account";
      subtitle.textContent = "Create your Keenan Travel account.";

      submitBtn.textContent = "Create Account";

      registerRow.style.display = "grid";
      usernameRow.style.display = "block";
      phoneRow.style.display = "block";
      confirmRow.style.display = "block";

      forgotRow.style.display = "none";
      backRow.style.display = "none";
    } else if (mode === "forgot") {
      title.textContent = "Reset Password";
      subtitle.textContent = "Password reset flow coming soon.";

      submitBtn.textContent = "Reset Password";

      registerRow.style.display = "none";
      usernameRow.style.display = "none";
      phoneRow.style.display = "none";
      confirmRow.style.display = "none";

      forgotRow.style.display = "none";
      backRow.style.display = "block";
    } else {
      title.textContent = "Welcome Back";
      subtitle.textContent =
        "Sign in to manage your bookings and travel profile.";

      submitBtn.textContent = "Sign In";

      registerRow.style.display = "none";
      usernameRow.style.display = "none";
      phoneRow.style.display = "none";
      confirmRow.style.display = "none";

      forgotRow.style.display = "flex";
      backRow.style.display = "none";
    }
  };

  window.submitAuth = async function (event) {
    event.preventDefault();

    clearAlert();

    try {
      const submitText = document.getElementById("auth-submit").textContent;

      const isRegister = submitText.includes("Create");

      const isForgot = submitText.includes("Reset");

      if (isForgot) {
        showAlert("Forgot password module will be connected later.", "success");

        return;
      }

      if (isRegister) {
        const password = document.getElementById("auth-password").value;

        const confirmPassword = document.getElementById(
          "auth-confirm-password",
        ).value;

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const payload = {
          first_name: document.getElementById("auth-first-name").value.trim(),

          last_name: document.getElementById("auth-last-name").value.trim(),

          username: document.getElementById("auth-username").value.trim(),

          email: document.getElementById("auth-email").value.trim(),

          phone: document.getElementById("auth-phone").value.trim(),

          password,
        };

        const result = await apiRequest("/auth/customer/register", payload);

        showAlert(result.message || "Account created successfully", "success");

        setTimeout(() => {
          setAuthMode("login");
        }, 1200);
      } else {
        const payload = {
          email: document.getElementById("auth-email").value,

          password: document.getElementById("auth-password").value,
        };

        const result = await apiRequest("/auth/customer/login", payload);

        localStorage.setItem("customerAuth", JSON.stringify(result));

        localStorage.setItem("customerToken", result.token || "");

        showAlert("Login successful", "success");

        console.log("Customer Login:", result);

        setTimeout(() => {
          if (typeof closeModal === "function") {
            closeModal("m-auth");
          }

          location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error("AUTH ERROR:", err);

      showAlert(err.message || "Authentication failed");
    }
  };

  window.signInWithGoogle = function () {
    showAlert("Google login integration coming soon.", "success");
  };

  window.logoutSession = function () {
    localStorage.removeItem("customerAuth");
    localStorage.removeItem("customerToken");

    location.reload();
  };

  window.KeenanFrontend.modules["auth-modal"] = {
    type: "component",

    mount(root) {
      if (!root) return;

      root.dataset.module = "auth-modal";
    },
  };
})();
