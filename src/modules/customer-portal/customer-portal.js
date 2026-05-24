(function () {

  const moduleName = "customer-portal";

  window.KeenanFrontend =
    window.KeenanFrontend || { modules: {} };

  window.KeenanFrontend.modules[moduleName] = {

    mount(target) {

      if (!target) return;

      console.log("[Customer Portal] Mounted");
    },
  };

  function getApiBase() {

  return (
    window.KEENAN_CONFIG?.authBaseUrl ||
    "http://localhost:3000/v1"
  ).replace(/\/$/, "");
}

  function getStoredToken() {

    try {

      const auth = JSON.parse(
        localStorage.getItem("customerAuth") || "{}"
      );

      return (
        auth.token ||
        localStorage.getItem("customerToken") ||
        ""
      );

    } catch (e) {

      return localStorage.getItem("customerToken") || "";
    }
  }

  function getStoredSession() {

    try {

      return JSON.parse(
        localStorage.getItem("customerAuth") || "{}"
      );

    } catch (e) {

      return {};
    }
  }

  function saveStoredSession(session) {

    localStorage.setItem(
      "customerAuth",
      JSON.stringify(session)
    );
  }

  window.openCustomerPortal = async function (
    tab = "profile"
  ) {

    const token = getStoredToken();

    if (!token) {

      if (typeof window.openAuthModal === "function") {

        window.openAuthModal("customer");
      }

      return;
    }

    const modal =
      document.getElementById("m-customer-portal");

    if (!modal) {

      console.error(
        "Customer portal modal not found"
      );

      return;
    }

    if (typeof window.openModal === "function") {

      window.openModal("m-customer-portal");

    } else {

      modal.classList.add("open");
    }

    await loadPortalData();

    switchPortalTab(tab);
  };

  async function loadPortalData() {

    try {

      const token = getStoredToken();

      const apiBase = getApiBase();

      const bookingsResponse = await fetch(
        `${apiBase}/customers/me/bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const bookingsData =
        await bookingsResponse.json();

      const session = getStoredSession();

      const user = session.user || {};

      updatePortalUI(
        user,
        bookingsData.data || []
      );

    } catch (err) {

      console.error(
        "Portal load error:",
        err
      );

      alert("Failed to load customer portal");
    }
  }

  function updatePortalUI(user, bookings) {

    const apiRoot = getApiBase().replace(
      "/v1",
      ""
    );

    const firstName =
      user.first_name ||
      user.firstName ||
      "";

    const lastName =
      user.last_name ||
      user.lastName ||
      "";

    const fullName =
      `${firstName} ${lastName}`.trim() ||
      "Customer";

    const displayName =
      document.getElementById(
        "portal-display-name"
      );

    if (displayName) {

      displayName.textContent = fullName;
    }

    const initials =
      fullName
        .split(" ")
        .map((v) => v[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const initialsEl =
      document.getElementById(
        "portal-avatar-initials"
      );

    if (initialsEl) {

      initialsEl.textContent = initials;
    }

    const imgEl =
      document.getElementById(
        "portal-avatar-img"
      );

    if (imgEl && initialsEl) {

      if (user.profile_picture) {

        imgEl.src =
          user.profile_picture.startsWith(
            "http"
          )
            ? user.profile_picture
            : `${apiRoot}${user.profile_picture}`;

        imgEl.style.display = "block";

        initialsEl.style.display = "none";

      } else {

        imgEl.style.display = "none";

        initialsEl.style.display = "flex";
      }
    }

    const form =
      document.getElementById(
        "portal-profile-form"
      );

    if (form) {

      form.first_name.value =
        firstName;

      form.last_name.value =
        lastName;

      form.email.value =
        user.email || "";

      form.phone.value =
        user.phone || "";

      form.address.value =
        user.address || "";
    }

    const statCount =
      document.getElementById(
        "portal-stat-count"
      );

    if (statCount) {

      statCount.textContent =
        bookings.length;
    }

    const total = bookings.reduce(
      (sum, b) =>
        sum + Number(b.amount || 0),
      0
    );

    const statSpend =
      document.getElementById(
        "portal-stat-spend"
      );

    if (statSpend) {

      statSpend.textContent =
        `AED ${total.toLocaleString()}`;
    }

    const tbody =
      document.getElementById(
        "portal-history-body"
      );

    if (!tbody) return;

    if (!bookings.length) {

      tbody.innerHTML = `
        <tr>
          <td colspan="8"
              style="text-align:center;padding:40px;">
            No booking history found.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = bookings
      .map(
        (b, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${b.reference || "-"}</td>
          <td>${b.service_name || b.service_type || "-"}</td>
          <td>${b.currency || "AED"} ${Number(
            b.amount || 0
          ).toLocaleString()}</td>
          <td>${new Date(
            b.created_at
          ).toLocaleDateString()}</td>
          <td>
            <span class="badge ${getStatusClass(
              b.status
            )}">
              ${(b.status || "pending").toUpperCase()}
            </span>
          </td>
          <td>
            <span class="badge ${getPaymentStatusClass(
              b.payment_status
            )}">
              ${(
                b.payment_status || "pending"
              ).toUpperCase()}
            </span>
          </td>
        </tr>
      `
      )
      .join("");
  }

  function getStatusClass(status) {

    if (status === "confirmed")
      return "b-green";

    if (status === "pending")
      return "b-gold";

    if (status === "cancelled")
      return "b-red";

    return "b-slate";
  }

  function getPaymentStatusClass(
    status
  ) {

    if (status === "received")
      return "b-green";

    if (status === "pending")
      return "b-gold";

    if (status === "cancelled")
      return "b-red";

    return "b-slate";
  }

  window.switchPortalTab = function (
    tab
  ) {

    document
      .querySelectorAll(".pn-item")
      .forEach((el) =>
        el.classList.remove("act")
      );

    document
      .querySelector(
        `.pn-item[data-tab="${tab}"]`
      )
      ?.classList.add("act");

    document
      .querySelectorAll(
        ".portal-tab-view"
      )
      .forEach((el) =>
        el.classList.remove("act")
      );

    document
      .getElementById(`pt-${tab}`)
      ?.classList.add("act");

    const title =
      document.getElementById(
        "portal-tab-title"
      );

    if (title) {

      title.textContent =
        tab === "profile"
          ? "My Profile"
          : "My Account";
    }
  };

  window.submitProfileUpdate =
    async function (e) {

      e.preventDefault();

      const btn =
        document.getElementById(
          "profile-save-btn"
        );

      const original =
        btn.textContent;

      btn.disabled = true;

      btn.textContent = "Saving...";

      try {

        const session =
          getStoredSession();

        const user =
          session.user || {};

        const form = e.target;

        const payload = {
          first_name:
            form.first_name.value,
          last_name:
            form.last_name.value,
          phone:
            form.phone.value,
          address:
            form.address.value,
        };

        const response =
          await fetch(
            `${getApiBase()}/customers/${user.id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${getStoredToken()}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                payload
              ),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {

          throw new Error(
            result.message ||
              "Update failed"
          );
        }

        session.user = {
          ...session.user,
          ...result.data,
        };

        saveStoredSession(session);

        alert(
          "Profile updated successfully"
        );

      } catch (err) {

        console.error(err);

        alert(
          err.message ||
            "Profile update failed"
        );

      } finally {

        btn.disabled = false;

        btn.textContent = original;
      }
    };

  window.handleAvatarUpload =
    async function (input) {

      if (
        !input.files ||
        !input.files[0]
      )
        return;

      const file = input.files[0];

      const formData =
        new FormData();

      formData.append(
        "avatar",
        file
      );

      try {

        const session =
          getStoredSession();

        const user =
          session.user || {};

        const response =
          await fetch(
            `${getApiBase()}/customers/${user.id}/avatar`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${getStoredToken()}`,
              },
              body: formData,
            }
          );

        const result =
          await response.json();

        if (!response.ok) {

          throw new Error(
            result.message ||
              "Avatar upload failed"
          );
        }

        session.user.profile_picture =
          result.profile_picture;

        saveStoredSession(session);

        await loadPortalData();

        alert(
          "Profile picture updated"
        );

      } catch (err) {

        console.error(err);

        alert(
          err.message ||
            "Avatar upload failed"
        );
      }
    };

})();