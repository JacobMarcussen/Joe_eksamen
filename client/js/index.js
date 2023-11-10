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
