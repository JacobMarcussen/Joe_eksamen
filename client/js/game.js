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

socket.on("game-started", function () {
  let gameCanvas = document.getElementById("gameCanvas");
  let joinGameButton = document.getElementById("join-game");
  let gameMessages = document.getElementById("game-messages");

  gameCanvas.style.border = "1px solid rgba(247, 193, 217, 1)";

  if (joinGameButton) {
    joinGameButton.style.display = "none";
  }

  if (gameMessages) {
    gameMessages.style.display = "none";
  }
});

// Setup the game canvas
let canvas = document.getElementById("gameCanvas");
let context = canvas.getContext("2d");

let dpr = window.devicePixelRatio || 1;
let rect = canvas.getBoundingClientRect();

canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;

context.scale(dpr, dpr);

document.addEventListener("keydown", (event) => {
  socket.emit("player-action", { type: "move", direction: event.key });
});

// Listen for game state updates from the server
socket.on("game-state", function (state) {
  // Render game based on state
  renderGame(state);
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
  const blockWidth = 10;
  const blockHeight = 5;
  const blockPadding = 5;
  const blockOffsetTop = 1;
  const blockOffsetLeft = 1;

  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.strokeStyle = "rgba(247, 193, 217, 1)";
  context.stroke();

  state.players.forEach((player, index) => {
    // Calculate offset for each player's side
    const playerOffsetX = index * (canvas.width / 2);
    // Draw the ball
    context.beginPath();
    context.arc(player.ball.x + playerOffsetX, player.ball.y, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(247, 193, 217, 1)";
    context.fill();
    context.closePath();

    // Draw player paddles
    context.beginPath();
    const paddleX = player.paddlePos + playerOffsetX;
    // Set the paddle's Y position to be a little above the bottom of the canvas
    const paddleY = canvas.height - paddleHeight - 10; // 10 pixels above the bottom
    context.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    context.fillStyle = "rgba(247, 193, 217, 1)";
    context.fill();
    context.closePath();

    // Draw blocks
    player.blocks.forEach((row, rowIndex) => {
      row.forEach((block, blockIndex) => {
        if (block) {
          context.beginPath();
          const x = playerOffsetX + blockIndex * (blockWidth + blockPadding) + blockOffsetLeft;
          const y = index * (canvas.height / 2) + rowIndex * (blockHeight + blockPadding) + blockOffsetTop;
          context.rect(x, y, blockWidth, blockHeight);
          context.fillStyle = "rgba(247, 193, 217, 1)";
          context.fill();
          context.closePath();
        }
      });
    });
  });
}
