function setupLoginPage() {
  const login_form = document.getElementById("login_form");

  login_form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    fetch("/auth/login", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((data) => {
        if (data === "User not found.") {
          window.alert("User not found. Please check your email or password.");
        } else {
          window.location.href = "/dashboard";
        }
      });
  });
}

function setupSignupPage() {
  const signup_form = document.getElementById("signup_form");

  signup_form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = {
      username: signup_form.querySelector("#username").value,
      password: signup_form.querySelector("#password").value,
      email: signup_form.querySelector("#email").value,
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
