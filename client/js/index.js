function myFunction(x) {
  x.classList.toggle("change");
}

document.getElementById('closeButton').addEventListener('click', function() {
  document.getElementById('confirmationOverlay').style.display = 'none';
});

