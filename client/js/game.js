// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("gameBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function () {
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

let socket = io.connect("https://joejuice.me/");

let roomIdInput = document.getElementById("room-id");
let joinRoomButton = document.getElementById("join-room");
let gameMessages = document.getElementById("game-messages");

function addMessage(message) {
  let p = document.createElement("p");
  p.innerText = message;
  gameMessages.appendChild(p);
}

joinRoomButton.addEventListener("click", function () {
  let roomID = roomIdInput.value.trim();
  if (roomID) {
    socket.emit("join-room", roomID);
  } else {
    addMessage("Please enter a room ID.");
  }
});

socket.on("message", function (message) {
  // Display the game messages
  addMessage(message);
});

socket.on("game-started", function (message) {
  // Handle the game start event
  addMessage(message);
  // You can add code here to switch to the game view if needed
});