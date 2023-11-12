function setupLoginPage() {
  const login_form = document.getElementById("login_form");

  login_form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = {
      password: login_form.querySelector("#password").value,
      email: login_form.querySelector("#email").value.toLowerCase(),
    };
    fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => response.text())
      .then((data) => {
        if (data === "User not found.") {
          window.alert("User not found. Please check your email or password.");
        } else if (data === "Invalid email or password") {
          window.alert("Invalid email or password. Please try again.");
        } else {
          window.location.href = "/dashboard";
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        window.alert("An error occurred during login.");
      });
  });
}

function setupSignupPage() {
  const signup_form = document.getElementById("signup_form");

  signup_form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = {
      username: signup_form.querySelector("#username").value.toLowerCase(),
      password: signup_form.querySelector("#password").value,
      email: signup_form.querySelector("#email").value.toLowerCase(),
      phone: signup_form.querySelector("#phone").value,
    };

    // Send data as JSON
    fetch("/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        } else if (response.status === 400) {
          return response.json().then((data) => {
            window.alert(data.message);
          });
        } else if (response.status === 500) {
          window.alert("Internal server error");
        }
      })
      .then((data) => {
        if (data) {
          window.location.href = "/confirm";
        }
      });
  });
}
function setupConfirmPhone() {
  const authForm = document.getElementById("login_form");
  authForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const authInput = document.getElementById("SMS_password").value;

    fetch("/auth/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code: authInput }),
    })
      .then((response) => {
        if (!response.ok) {
          // If the HTTP status code is not successful, throw an error
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); // Parse the JSON in the response
      })
      .then((data) => {
        // Make sure to check if 'data' and 'data.message' exist
        if (data && data.message) {
          console.log(data.message);
          window.location.href = "/login";
        } else {
          // If 'data.message' doesn't exist, throw an error
          throw new Error("No message in response");
        }
      })
      .catch((error) => {
        // Log or handle any errors that occurred during the fetch
        console.error("Verification error:", error);
        alert("Verification failed, please try again.");
      });
  });
}

function setupDashboardPage() {
  const logoutButton = document.getElementById("sign_out");
  const confirmationOverlay = document.getElementById("confirmationOverlay");

  logoutButton.addEventListener("click", function () {
    // Show the confirmation overlay
    confirmationOverlay.style.display = "block";
  });

  const confirmLogoutButton = document.getElementById("confirmLogoutButton");
  confirmLogoutButton.addEventListener("click", function () {
    // Hide the confirmation overlay when the user confirms log-out
    confirmationOverlay.style.display = "none";
    fetch("/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ confirmation: true }),
    }).then((response) => {
      if (response.status === 204) {
        window.location.href = "/login";
      } else if (response.status === 400) {
        window.alert("Confirmation required");
      }
    });
  });

  //Delete
  const deleteUserButton = document.getElementById("delete_user");

  deleteUserButton.addEventListener("click", function () {
    // Display a confirmation dialog
    if (confirm("Are you sure you want to delete your account?")) {
      // User confirmed, send a request to delete the user
      fetch("/auth/deleteUser", {
        method: "DELETE",
      }).then((response) => {
        if (response.status === 204) {
          console.log("User deleted successfully");
          window.location.href = "/login";
        } else {
          window.alert("An error occurred while deleting the user");
        }
      });
    }
  });
}

const currentPage = window.location.pathname;
if (currentPage === "/login") {
  setupLoginPage();
} else if (currentPage === "/signup") {
  setupSignupPage();
} else if (currentPage === "/dashboard") {
  setupDashboardPage();
} else if (currentPage === "/confirm") {
  setupConfirmPhone();
}
