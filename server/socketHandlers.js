const { Socket } = require("socket.io");

module.exports = (io) => {
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

  //Create Blocks
  function createBlocks() {
    let blocks = [];
    //5 rækker
    for (let i = 0; i < 4; i++) {
      blocks[i] = [];
      //12 kolonner
      for (let j = 0; j < 8; j++) {
        blocks[i][j] = true;
      }
    }
    return blocks;
  }

  //set the mapping
  function joinRoom(socketId, roomID) {
    socketToRoom[socketId] = roomID;
  }

  //delete the mapping
  function leaveRoom(socketId) {
    delete socketToRoom[socketId];
  }

  //Finder rigtige rum
  function findRoomIDBySocketID(socketId) {
    return socketToRoom[socketId];
  }

  //new game state
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
          ball: { x: ballPosPlayer1, y: 350, vx: horizontalSpeed, vy: verticalSpeed, radius: ballRadius },
          movingLeft: false,
          movingRight: false,
          ballMissed: false,
        },
        {
          paddlePos: 375,
          score: 0,
          blocks: initialBlocksPlayer2,
          ball: { x: ballPosPlayer2, y: 350, vx: horizontalSpeed, vy: verticalSpeed, radius: ballRadius },
          movingLeft: false,
          movingRight: false,
          ballMissed: true,
        },
      ],
    };

    // Store the new state in the gameStates object
    gameStates[roomID] = newState;
    return newState;
  }

  function ballHitsPaddle(ball, paddle) {
    const paddleTopY = canvasHeight - paddleHeight - canvasBottomToPaddle;
    const paddleBottomY = canvasHeight - canvasBottomToPaddle;

    // Check if the ball is within the horizontal range of the paddle
    const withinPaddleHorizontal =
      ball.x + ball.radius > paddle.paddlePos && ball.x - ball.radius < paddle.paddlePos + paddleWidth;

    // Check if the ball is colliding with the top surface of the paddle
    const collidesWithTopOfPaddle =
      ball.y + ball.radius > paddleTopY && // Ball is below the top edge of the paddle
      ball.y - ball.radius < paddleBottomY; // Ball's top is above the paddle's bottom

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
            blocks[i][j] = false; // Block destroyed

            // Find the closest edge
            const closestEdge = {
              x: ball.vx > 0 ? blockX - 1 : blockX + blockWidth + 1,
              y: ball.vy > 0 ? blockY - 1 : blockY + blockHeight + 1,
            };

            // Determine the side of the collision
            const verticalOverlap = ball.vy > 0 ? ballBottomEdge - blockY : blockY + blockHeight - ballTopEdge;
            const horizontalOverlap = ball.vx > 0 ? ballRightEdge - blockX : blockX + blockWidth - ballLeftEdge;

            if (verticalOverlap < horizontalOverlap) {
              ball.vy *= -1; // Reverse vertical direction
              ball.y = closestEdge.y; // Adjust ball y position to be outside the block
            } else {
              ball.vx *= -1; // Reverse horizontal direction
              ball.x = closestEdge.x; // Adjust ball x position to be outside the block
            }

            return true; // Collision detected
          }
        }
      }
    }
    return false; // No collision detected
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
        return; // Skip this iteration
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

    // Emit the updated state to both players
    io.to(state.roomID).emit("game-state", state);
  }

  function checkCollisions(state) {
    state.players.forEach((player) => {
      if (ballHitsPaddle(player.ball, player)) {
        player.ball.vy *= -1; // Reverse ball direction
        if (player.ball.vy > 0) {
          // Ball moving downwards, place it below the paddle
          player.ball.y = canvasHeight - paddleHeight - canvasBottomToPaddle + player.ball.radius + 1;
        } else {
          // Ball moving upwards, place it above the paddle
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
      // Check if the ball hits the ground
      if (player.ball.y + player.ball.radius >= canvasHeight - 5) {
        player.ballMissed = true; // Indicate that this player missed the ball
        gameOver = true;
      }

      // Check if all blocks are cleared
      else if (player.blocks.every((row) => row.every((block) => !block))) {
        gameOver = true;
      }
    });

    if (gameOver) {
      endGame(state); // Now, endGame can check each player's ballMissed status
    }
  }

  function endGame(state) {
    const loser = state.players.find((player) => player.ballMissed);
    const winnerId = loser ? state.players.find((player) => player.id !== loser.id).id : null;

    clearInterval(gameIntervals[state.roomID]); // Stop the game loop
    delete gameStates[state.roomID]; // Clean up the game state
    delete gameIntervals[state.roomID]; // Clean up the game interval
    io.to(state.roomID).emit("game-over", {
      message: "You Won! Game over",
      winnerId: winnerId,
      redirectTo: "/dashboard",
    });
  }

  //game start
  function startGame(roomID, playerSockets) {
    const state = createGameState(roomID);

    state.players[0].id = playerSockets[0];

    if (playerSockets[1]) {
      state.players[1].id = playerSockets[1];
    }

    state.roomID = roomID;
    io.to(roomID).emit("game-started", {
      message: "The game is about to begin!",
    });
    // Broadcast initial game state
    setTimeout(() => {
      io.to(roomID).emit("game-state", state);
      // Start the game loop
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

      // When a player wants to join, add them to the waiting queue or pair them if possible
      if (waitingPlayers.length > 0) {
        // Pair the current socket with the first waiting player
        const opponentSocketId = waitingPlayers.shift(); // Dequeue the waiting player

        // Create a unique room ID using both socket IDs to ensure uniqueness
        const roomID = `room_${socket.id}_${opponentSocketId}`;

        joinRoom(socket.id, roomID);
        joinRoom(opponentSocketId, roomID);
        socket.join(roomID);
        io.sockets.sockets.get(opponentSocketId).join(roomID);

        // Notify both players that the game is starting
        io.to(roomID).emit("message", "Game is starting...");

        // Start the game for this room
        startGame(roomID, [socket.id, opponentSocketId]);
      } else {
        // No opponents waiting, add the player to the waiting queue
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

      // Update the player's movement state
      if (action.type === "move") {
        if (action.direction === "left") {
          player.movingLeft = action.state === "down";
        } else if (action.direction === "right") {
          player.movingRight = action.state === "down";
        }
      }
    });

    socket.on("disconnect", () => {
      // Remove the socket from the waiting queue if it disconnects before pairing
      const index = waitingPlayers.indexOf(socket.id);
      if (index !== -1) {
        waitingPlayers.splice(index, 1);
      }
      const roomID = findRoomIDBySocketID(socket.id);
      if (roomID) {
        // Do any cleanup necessary for the player leaving the room
        leaveRoom(socket.id);
      }
    });
  }

  return {
    handleConnection,
  };
};
