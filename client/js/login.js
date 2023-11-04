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
        "Content-Type": "application/json", // Set the content type to JSON
      },
      body: JSON.stringify(formData), // Convert to JSON string
    })
      .then((response) => response.text())
      .then((data) => {
        if (data === "User not found.") {
          window.alert("User not found. Please check your email or password.");
        } else if (data === "Invalid email or password") {
          window.alert("Invalid email or password. Please try again.");
        } else {
          // Successfully logged in, you can redirect or perform other actions
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
        "Content-Type": "application/json", // Set the content type to JSON
      },
      body: JSON.stringify(formData), // Convert to JSON string
    })
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        } else if (response.status === 401) {
          return response.json().then((data) => {
            window.alert(data.message);
          });
        } else if (response.status === 500) {
          window.alert("Internal server error");
        }
      })
      .then((data) => {
        console.log(data);
        if (data) {
          window.location.href = "/login";
        }
      });
  });
}

const currentPage = window.location.pathname;
if (currentPage === "/login") {
  setupLoginPage();
} else if (currentPage === "/signup") {
  setupSignupPage();
}
