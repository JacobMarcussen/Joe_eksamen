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

let socket = io.connect();
let joinGameButton = document.getElementById("join-game");
let gameMessages = document.getElementById("game-messages");

function addMessage(message) {
  let p = document.createElement("p");
  p.innerText = message;
  gameMessages.appendChild(p);
}

joinGameButton.addEventListener("click", function () {
  // Emit a join event immediately upon connection
  socket.emit("join-game");
});

socket.on("message", function (message) {
  // Display the game messages
  addMessage(message);
});

document.body.style.overflow = "hidden";

socket.on("game-started", function (joinGameButton, gameMessages) {
  // Hide the join button and messages
  joinGameButton.style.display = "none";
  gameMessages.style.display = "none";

  // Open the modal and adjust its size
  modal.style.display = "block";
  modal.style.paddingTop = "5%"; // Push down from the top a bit

  adjustCanvasSize();
});

function adjustCanvasSize() {
  var modalWidth = modal.clientWidth; // Width of the modal
  var modalHeight = modal.clientHeight; // Height of the modal
  var aspectRatio = 16 / 9; // Aspect ratio of your game

  if (modalWidth / aspectRatio <= modalHeight) {
    canvas.width = modalWidth;
    canvas.height = modalWidth / aspectRatio;
  } else {
    canvas.height = modalHeight;
    canvas.width = modalHeight * aspectRatio;
  }

  // Adjust the canvas style
  canvas.style.maxWidth = canvas.width + "px";
  canvas.style.maxHeight = canvas.height + "px";
}

window.addEventListener("resize", adjustCanvasSize);

// Setup the game canvas
let canvas = document.getElementById("gameCanvas");
let context = canvas.getContext("2d");

// Listen for game state updates from the server
socket.on("game-state", function (state) {
  // Render game based on state
  renderGame(state);
});

// Function to capture input and send to server
function sendInput(input) {
  socket.emit("player-input", input);
}

// Listen for user input
document.addEventListener("keydown", function (e) {
  // Send user input to server
  sendInput({ key: e.key });
});

// Function to render the game
// Function to render the game
function renderGame(state) {
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  //Defining 2d objects
  const ballRadius = 5;
  const paddleHeight = 2;
  const paddleWidth = 75;
  const blockWidth = 25;
  const blockHeight = 10;
  const blockPadding = 10;
  const blockOffsetTop = 30;
  const blockOffsetLeft = 30;

  // Draw the ball
  context.beginPath();
  context.arc(state.ball.x, state.ball.y, ballRadius, 0, Math.PI * 2);
  context.fillStyle = "#0095DD";
  context.fill();
  context.closePath();

  // Draw player paddles
  state.players.forEach((player) => {
    context.beginPath();
    context.rect(player.paddlePos, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    context.fillStyle = "#0095DD";
    context.fill();
    context.closePath();
  });

  // Draw blocks
  state.players.forEach((player, index) => {
    player.blocks.forEach((row, rowIndex) => {
      row.forEach((block, blockIndex) => {
        if (block) {
          context.beginPath();
          const x = blockIndex * (blockWidth + blockPadding) + blockOffsetLeft;
          const y =
            index * (canvas.height / 2) + rowIndex * (blockHeight + blockPadding) + blockOffsetTop;
          context.rect(x, y, blockWidth, blockHeight);
          context.fillStyle = "#0095DD";
          context.fill();
          context.closePath();
        }
      });
    });
  });
}
