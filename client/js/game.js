let socket = io.connect();
let joinGameButton = document.getElementById("join-game");
let gameMessages = document.getElementById("game-messages");
//Henter socket.id'et på brugeren, så den korrekte vinder kan findes
let mySocketId;
socket.on("connect", () => {
  mySocketId = socket.id;
});

//Henter cookien med brugernavn
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
}
const current_user = getCookie("current_user");

socket.on("player-identity", function (data) {
  playerNumber = data.playerNumber;
});

function startCountdown(duration) {
  var countdownContainer = document.getElementById("countdownContainer");
  var countdownText = document.getElementById("countdownText");
  countdownContainer.style.display = "flex"; // Show the countdown
  var remaining = duration;

  var countdownInterval = setInterval(function () {
    countdownText.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownContainer.style.display = "none"; // Hide the countdown
    }
    remaining--;
  }, 1000);
}

function addMessage(message) {
  //Displayer beskeder
  let p = document.createElement("p");
  p.innerText = message;
  gameMessages.appendChild(p);
}

joinGameButton.addEventListener("click", function () {
  //Emitter brugeren der vil tilslutte sig til et spil, samt skærmstørrelsen
  const screenWidth =
    window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  const screenHeight =
    window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  socket.emit("join-game", { screenWidth, screenHeight });
});

socket.on("message", function (message) {
  //Viser beskeder som bliver emittet fra serveren
  addMessage(message);
});

//Brugeren skal ikke kunne scroll
document.body.style.overflow = "hidden";

socket.on("game-started", function (data) {
  //Starter countdown
  let gameCanvas = document.getElementById("gameCanvas");
  let joinGameButton = document.getElementById("join-game");
  let gameMessages = document.getElementById("game-messages");
  let playerScores = document.getElementById("playerScores");

  gameMessages.innerHTML = data.message;

  gameCanvas.style.border = "1px solid rgba(247, 193, 217, 1)";

  //Fjerner beskeder under spillet
  if (joinGameButton) {
    joinGameButton.style.display = "none";
  }
  if (gameMessages) {
    gameMessages.style.display = "none";
  }
  //Displayer scoren for hver spiller
  if (playerScores) {
    playerScores.style.display = "inline-flex";
  }
  if (gameCanvas) {
    gameCanvas.style.display = "block";
  }
  startCountdown(3);
});

//Initialiserer canvas
let canvas = document.getElementById("gameCanvas");
let context = canvas.getContext("2d");

//Emitter keydown/keyup som true/false, så platformen bevæger sig med det samme
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

//Renderer spillet
socket.on("game-state", function (state) {
  // Render game based on state
  renderGame(state);
});

//Displayer scoren emittet fra serveren
socket.on("score", function (scores) {
  let player1Score = document.getElementById("player1Score");
  let player2Score = document.getElementById("player2Score");

  player1Score.innerHTML = "Player 1 " + "Score: " + scores.score[0];
  player2Score.innerHTML = "Player 2 " + "Score: " + scores.score[1];
});

//Sender besked til brugeren, samt sender dem til /dashboard når spillet slutter
socket.on("game-over", function (data) {
  console.log("Game event received"); // Add this for debugging

  if (data.winnerId === mySocketId) {
    console.log("Game won event received"); // Add this for debugging

    fetch("/leaderboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ winner: current_user }),
      credentials: "include",
    }).catch((error) => console.error("Error:", error));

    alert("You Won! Game over");
    window.location.href = data.redirectTo;
  } else {
    console.log("Game lost event received"); // Add this for debugging

    alert("You Lost! Game over");
    window.location.href = data.redirectTo;
  }
});

var blockImage = new Image();
blockImage.src = "../img/tunacado.png";

// A flag to check if the image is loaded
var isImageLoaded = false;

blockImage.onload = function () {
  // Set the flag to true once the image is loaded
  isImageLoaded = true;
};

function renderGame(state) {
  //Tømmer canvas, hvis der skulle være noget
  context.clearRect(0, 0, canvas.width, canvas.height);

  //2d objekter
  const ballRadius = 5;
  const paddleHeight = 5;
  const paddleWidth = 75;
  const blockWidth = 41;
  const blockHeight = 30;
  const blockPadding = 50;
  const blockOffsetTop = 40;

  //Streg i midten, der deler canvas i to
  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.strokeStyle = "rgba(247, 193, 217, 1)";
  context.stroke();

  //Tegner bolden, paddle, og blocks for hver spiller
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
    if (isImageLoaded) {
      state.players.forEach((player, playerIndex) => {
        const totalBlocksWidth =
          blockWidth * player.blocks[0].length + blockPadding * (player.blocks[0].length - 1);
        const playerAreaStartX = playerIndex * (canvas.width / 2);
        const playerAreaWidth = canvas.width / 2;
        const gridStartX = playerAreaStartX + (playerAreaWidth - totalBlocksWidth) / 2;

        player.blocks.forEach((row, rowIndex) => {
          row.forEach((block, blockIndex) => {
            if (block) {
              const x = gridStartX + blockIndex * (blockWidth + blockPadding);
              const y = rowIndex * (blockHeight + blockPadding) + blockOffsetTop;
              const scaledWidth = blockWidth * 1.3; // 1.3 > 1 to increase size
              const scaledHeight = blockHeight * 1.3; // scaleFactor > 1 to increase size
              context.drawImage(blockImage, x, y, scaledWidth, scaledHeight);
            }
          });
        });
      });
    }
  });
}
