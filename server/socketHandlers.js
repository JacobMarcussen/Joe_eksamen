module.exports = (io) => {
  // Definerer variabler for spillet
  const waitingPlayers = [];
  const gameStates = {};
  const socketToRoom = {};
  const gameIntervals = {};

  const canvasHeight = 700;
  const canvasWidth = 1500;
  const paddleHeight = 5;
  const ballRadius = 5;
  const canvasBottomToPaddle = 60;
  const paddleWidth = 75;

  const baseRes = { width: 1920, height: 1080 };
  let paddleMoveSpeed = 10;
  let verticalSpeed = 3;
  let horizontalSpeed = 3;

  // Laver Blocks
  function createBlocks() {
    let blocks = [];
    // 4 rækker
    for (let i = 0; i < 4; i++) {
      blocks[i] = [];
      // 8 kolonner
      for (let j = 0; j < 8; j++) {
        blocks[i][j] = true;
      }
    }
    return blocks;
  }

  function joinRoom(socketId, roomID) {
    socketToRoom[socketId] = roomID;
  }

  function leaveRoom(socketId) {
    delete socketToRoom[socketId];
  }

  // Finder rigtige rum
  function findRoomIDBySocketID(socketId) {
    return socketToRoom[socketId];
  }

  // Laver ny game state
  function createGameState(roomID) {
    const initialBlocksPlayer1 = createBlocks();
    const initialBlocksPlayer2 = createBlocks();
    const ballPosPlayer1 = Math.floor(Math.random() * (745 - 5 + 1)) + 5;
    const ballPosPlayer2 = Math.floor(Math.random() * (745 - 5 + 1)) + 5;

    const newState = {
      players: [
        {
          paddlePos: 375,
          score: 0,
          blocks: initialBlocksPlayer1,
          ball: {
            x: ballPosPlayer1,
            y: 350,
            vx: horizontalSpeed,
            vy: verticalSpeed,
            radius: ballRadius,
          },
          movingLeft: false,
          movingRight: false,
          ballMissed: false,
        },
        {
          paddlePos: 375,
          score: 0,
          blocks: initialBlocksPlayer2,
          ball: {
            x: ballPosPlayer2,
            y: 350,
            vx: horizontalSpeed,
            vy: verticalSpeed,
            radius: ballRadius,
          },
          movingLeft: false,
          movingRight: false,
          ballMissed: true,
        },
      ],
    };

    // Gemmer game state i gameStates objektet
    gameStates[roomID] = newState;
    return newState;
  }

  function ballHitsPaddle(ball, paddle) {
    const paddleTopY = canvasHeight - paddleHeight - canvasBottomToPaddle;
    const paddleBottomY = canvasHeight - canvasBottomToPaddle;

    // Tjek om bolden er inden for den vandrette rækkevidde
    const withinPaddleHorizontal =
      ball.x + ball.radius > paddle.paddlePos && ball.x - ball.radius < paddle.paddlePos + paddleWidth;

    // Tjek, om bolden kolliderer med den øverste overflade
    const collidesWithTopOfPaddle =
      ball.y + ball.radius > paddleTopY &&
      ball.y - ball.radius < paddleBottomY;

    return withinPaddleHorizontal && collidesWithTopOfPaddle;
  }

  function ballHitsBlock(ball, blocks) {
    const blockWidth = 41;
    const blockHeight = 30;
    const blockPadding = 50;
    const blockOffsetTop = 40;
    const blockOffsetLeft = 40;

    for (let i = 0; i < blocks.length; i++) {
      for (let j = 0; j < blocks[i].length; j++) {
        if (blocks[i][j]) {
          const blockX = j * (blockWidth + blockPadding) + blockOffsetLeft;
          const blockY = i * (blockHeight + blockPadding) + blockOffsetTop;

          const ballLeftEdge = ball.x - ball.radius;
          const ballRightEdge = ball.x + ball.radius;
          const ballTopEdge = ball.y - ball.radius;
          const ballBottomEdge = ball.y + ball.radius;

          if (
            ballRightEdge > blockX &&
            ballLeftEdge < blockX + blockWidth &&
            ballBottomEdge > blockY &&
            ballTopEdge < blockY + blockHeight
          ) {
            // En block bliver ødelagt
            blocks[i][j] = false; 

            // Finder nærmeste kant
            const closestEdge = {
              x: ball.vx > 0 ? blockX - 1 : blockX + blockWidth + 1,
              y: ball.vy > 0 ? blockY - 1 : blockY + blockHeight + 1,
            };

            // Bestem siden af kollisionen
            const verticalOverlap = ball.vy > 0 ? ballBottomEdge - blockY : blockY + blockHeight - ballTopEdge;
            const horizontalOverlap = ball.vx > 0 ? ballRightEdge - blockX : blockX + blockWidth - ballLeftEdge;

            // Ændrer boldens position og retning
            if (verticalOverlap < horizontalOverlap) {
              ball.vy *= -1; 
              ball.y = closestEdge.y; 
            } else {
              ball.vx *= -1; 
              ball.x = closestEdge.x; 
            }
            // Registrerer kollision
            return true; 
          }
        }
      }
    }
    // Registrerer ingen kollision
    return false; 
  }

  // Game loop function
  function gameLoop(state) {
    state.players.forEach((player, index) => {
      if (player.movingLeft) {
        player.paddlePos = Math.max(player.paddlePos - paddleMoveSpeed, 0);
      } else if (player.movingRight) {
        player.paddlePos = Math.min(player.paddlePos + paddleMoveSpeed, canvasWidth / 2 - paddleWidth);
      }

      if (!player.ball) {
        console.error("Ball object not found for player", index);
        return;
      }

      checkCollisions(state);

      const ball = player.ball;

      ball.x += ball.vx;
      ball.y += ball.vy;

      const leftBoundary = 0;
      const rightBoundary = canvasWidth / 2;

      if (ball.x - ballRadius < leftBoundary || ball.x + ballRadius > rightBoundary) {
        ball.vx *= -1;
        ball.x = Math.max(ball.x, ballRadius);
        ball.x = Math.min(ball.x, rightBoundary - ballRadius);
      }
      if (ball.y - ballRadius < 0 || ball.y + ballRadius > canvasHeight) {
        ball.vy *= -1;
        ball.y = Math.max(ball.y, ballRadius);
        ball.y = Math.min(ball.y, canvasHeight - ballRadius);
      }
      checkGameOver(state);
    });

    // Send den opdaterede tilstand til begge spillere
    io.to(state.roomID).emit("game-state", state);
  }
// Tjekker kollision
  function checkCollisions(state) {
    state.players.forEach((player) => {
      if (ballHitsPaddle(player.ball, player)) {
        player.ball.vy *= -1;
        if (player.ball.vy > 0) {
          player.ball.y = canvasHeight - paddleHeight - canvasBottomToPaddle + player.ball.radius + 1;
        } else {
          player.ball.y = canvasHeight - paddleHeight - canvasBottomToPaddle - player.ball.radius - 1;
        }
      }

      if (ballHitsBlock(player.ball, player.blocks)) {
        player.score++;
        io.to(state.roomID).emit("score", {
          score: [state.players[0].score, state.players[1].score],
        });
      }
    });
  }

  function checkGameOver(state) {
    let gameOver = false;

    state.players.forEach((player) => {
      // Tjekker om bolden rammer jorden
      if (player.ball.y + player.ball.radius >= canvasHeight - 5) {
        player.ballMissed = true; 
        gameOver = true;
      }
      else if (player.blocks.every((row) => row.every((block) => !block))) {
        gameOver = true;
      }
    });

    if (gameOver) {
      endGame(state); // Slutter spillet hvis bolden er misset
    }
  }
  // Stopper spillet og nulstiller game state
  function endGame(state) {
    const loser = state.players.find((player) => player.ballMissed);
    const winnerId = loser ? state.players.find((player) => player.id !== loser.id).id : null;

    clearInterval(gameIntervals[state.roomID]); 
    delete gameStates[state.roomID]; 
    delete gameIntervals[state.roomID]; 
    io.to(state.roomID).emit("game-over", {
      winnerId: winnerId,
      redirectTo: "/dashboard",
    });
  }

  // Starter spillet
  function startGame(roomID, playerSockets) {
    const state = createGameState(roomID);

    state.players[0].id = playerSockets[0];

    if (playerSockets[1]) {
      state.players[1].id = playerSockets[1];
    }
    io.to(playerSockets[0]).emit("player-identity", { playerNumber: 1 });
    if (playerSockets[1]) {
      io.to(playerSockets[1]).emit("player-identity", { playerNumber: 2 });
    }
    state.roomID = roomID;
    io.to(roomID).emit("game-started", {
      message: "The game is about to begin!",
    });
    // Opsætter indlende game state
    setTimeout(() => {
      io.to(roomID).emit("game-state", state);
      // Starter game loop
      gameIntervals[state.roomID] = setInterval(() => gameLoop(state), 1000 / 200); // Run at 60 fps
    }, 4000);
  }

  function handleConnection(socket) {
    socket.on("join-game", (resolution) => {
      // Udregner paddleMoveSpeed og boldens hastighed ud fra skærmopløsningen
      const scaleFactor = resolution.screenWidth / baseRes.width / 2;
      paddleMoveSpeed = 10 * scaleFactor;
      verticalSpeed = 3 * scaleFactor;
      horizontalSpeed = 3 * scaleFactor;

      // Tilføjer spillere til venteliste eller sætter dem i et aktivt spil
      if (waitingPlayers.length > 0) {
        // Sætter 2 spillere i spil sammen
        const opponentSocketId = waitingPlayers.shift(); // Dequeue the waiting player

        // Opret et unikt rum-id ved at bruge begge socket-id'er for at sikre unikhed
        const roomID = `room_${socket.id}_${opponentSocketId}`;

        joinRoom(socket.id, roomID);
        joinRoom(opponentSocketId, roomID);
        socket.join(roomID);
        io.sockets.sockets.get(opponentSocketId).join(roomID);
        io.to(roomID).emit("message", "Game is starting...");

        // Starter spil
        startGame(roomID, [socket.id, opponentSocketId]);
      } else {
        // Sætter spillere i kø, hvis der ikke er nogle klar til at spille
        waitingPlayers.push(socket.id);
        socket.emit("message", "Waiting for an opponent...");
      }
    });

    socket.on("player-action", (action) => {
      const roomID = findRoomIDBySocketID(socket.id);
      const state = gameStates[roomID];
      if (!state) {
        console.error("No game state found for room:", roomID);
        return;
      }
      const player = state.players.find((p) => p.id === socket.id);
      if (!player) {
        console.error("Player not found for action:", action);
        return;
      }

      // Opdater spillerens bevægelsestilstand
      if (action.type === "move") {
        if (action.direction === "left") {
          player.movingLeft = action.state === "down";
        } else if (action.direction === "right") {
          player.movingRight = action.state === "down";
        }
      }
    });

    socket.on("disconnect", () => {
      // Fjern socket fra ventekøen, hvis det afbrydes før parring
      const index = waitingPlayers.indexOf(socket.id);
      if (index !== -1) {
        waitingPlayers.splice(index, 1);
      }
      const roomID = findRoomIDBySocketID(socket.id);
      if (roomID) {
        leaveRoom(socket.id);
      }
    });
  }

  return {
    handleConnection,
  };
};
