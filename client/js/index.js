function myFunction(x) {
  x.classList.toggle("change");
}

document.getElementById("closeButton").addEventListener("click", function () {
  document.getElementById("confirmationOverlay").style.display = "none";
});

if (window.location.pathname === "/dashboard") {
  var btn = document.getElementById("gameBtn");
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("clicked");
    window.location.href = "/game";
  });
}
function getAllUsers() {
  fetch("/leaderboard", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log(response);
        console.log(response.json());
        return response.json(); // Parse the JSON in the response
      }
    })
    .catch((error) => {
      // Log or handle any errors that occurred during the fetch
      console.error("Verification error:", error);
      alert("Verification failed, please try again.");
    });
}
getAllUsers();
