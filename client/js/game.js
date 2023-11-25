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

socket.on("game-started", function (data) {
  let gameCanvas = document.getElementById("gameCanvas");
  let joinGameButton = document.getElementById("join-game");
  let gameMessages = document.getElementById("game-messages");
  let playerScores = document.getElementById("playerScores");

  gameMessages.innerHTML = data.message;

  gameCanvas.style.border = "1px solid rgba(247, 193, 217, 1)";

  if (joinGameButton) {
    joinGameButton.style.display = "none";
  }

  if (gameMessages) {
    gameMessages.style.display = "none";
  }
  if (playerScores) {
    playerScores.style.display = "inline-flex";
  }
});

// Setup the game canvas
let canvas = document.getElementById("gameCanvas");
let context = canvas.getContext("2d");

let leftKeyPressed = false;
let rightKeyPressed = false;
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" && !leftKeyPressed) {
    leftKeyPressed = true;
    socket.emit("player-action", { type: "move", direction: "left", state: "down" });
  } else if (event.key === "ArrowRight" && !rightKeyPressed) {
    rightKeyPressed = true;
    socket.emit("player-action", { type: "move", direction: "right", state: "down" });
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" && leftKeyPressed) {
    leftKeyPressed = false;
    socket.emit("player-action", { type: "move", direction: "left", state: "up" });
  } else if (event.key === "ArrowRight" && rightKeyPressed) {
    rightKeyPressed = false;
    socket.emit("player-action", { type: "move", direction: "right", state: "up" });
  }
});

// Listen for game state updates from the server
socket.on("game-state", function (state) {
  // Render game based on state
  renderGame(state);
});

socket.on("score", function (scores) {
  let player1Score = document.getElementById("player1Score");
  let player2Score = document.getElementById("player2Score");

  player1Score.innerText = "Score: " + scores.score[0];
  player2Score.innerText = "Score: " + scores.score[1];
  if (scores.score[0] === 32) {
    alert("Player 1 won!");
  }
  if (scores.score[1] === 32) {
    alert("Player 2 won!");
  }
});

socket.on("game-over", function (data) {
  alert(data.message);
  window.location.href = data.redirectTo;
});

function renderGame(state) {
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  //2d objects
  const ballRadius = 5;
  const paddleHeight = 5;
  const paddleWidth = 75;
  const blockWidth = 41;
  const blockHeight = 30;
  const blockPadding = 50;
  const blockOffsetTop = 40;

  //Streg i midten
  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.strokeStyle = "rgba(247, 193, 217, 1)";
  context.stroke();

  state.players.forEach((player, index) => {
    const playerOffsetX = index * (canvas.width / 2);

    //Ball
    context.beginPath();
    context.arc(player.ball.x + playerOffsetX, player.ball.y, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(247, 193, 217, 1)";
    context.fill();
    context.closePath();

    //Paddle
    context.beginPath();
    const paddleX = player.paddlePos + playerOffsetX;
    const paddleY = canvas.height - paddleHeight - 60;
    context.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    context.fillStyle = "rgba(247, 193, 217, 1)";
    context.fill();
    context.closePath();

    //Blocks
    context.beginPath();
    state.players.forEach((player, playerIndex) => {
      const totalBlocksWidth =
        blockWidth * player.blocks[0].length + blockPadding * (player.blocks[0].length - 1);
      // Calculate the starting x-coordinate for the blocks relative to each player's area
      const playerAreaStartX = playerIndex * (canvas.width / 2);
      const playerAreaWidth = canvas.width / 2;
      const gridStartX = playerAreaStartX + (playerAreaWidth - totalBlocksWidth) / 2;

      player.blocks.forEach((row, rowIndex) => {
        row.forEach((block, blockIndex) => {
          if (block) {
            const x = gridStartX + blockIndex * (blockWidth + blockPadding);
            const y = rowIndex * (blockHeight + blockPadding) + blockOffsetTop;
            context.rect(x, y, blockWidth, blockHeight);
          }
        });
      });
    });
    context.fillStyle = "rgba(247, 193, 217, 1)";
    context.fill();
    context.closePath();
  });
}
