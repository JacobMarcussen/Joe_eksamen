module.exports = (io) => {
  const waitingPlayers = [];
  const gameStates = {};
  const socketToRoom = {};
  const gameIntervals = {};

  //Create Blocks
  function createBlocks() {
    let blocks = [];
    //5 rækker
    for (let i = 0; i < 5; i++) {
      blocks[i] = [];
      //12 kolonner
      for (let j = 0; j < 12; j++) {
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
    const newState = {
      players: [
        {
          paddlePos: 375,
          score: 0,
          blocks: createBlocks(),
          ball: { x: 375, y: 350, vx: 2, vy: 2, radius: 5 },
          movingLeft: false,
          movingRight: false,
        },
        {
          paddlePos: 375,
          score: 0,
          blocks: createBlocks(),
          ball: { x: 375, y: 350, vx: 2, vy: 2, radius: 5 },
          movingLeft: false,
          movingRight: false,
        },
      ],
    };

    // Store the new state in the gameStates object
    gameStates[roomID] = newState;
    return newState;
  }

  function ballHitsPaddle(ball, paddle) {
    const paddleWidth = 75; // Assuming the width of the paddle
    const paddleHeight = 5; // Assuming the height of the paddle
    const canvasHeight = 700;

    const paddleY = canvasHeight - paddleHeight - 10;
    // Check if the ball's position overlaps with the paddle's position
    return (
      ball.x + ball.radius > paddle.paddlePos &&
      ball.x - ball.radius < paddle.paddlePos + paddleWidth &&
      ball.y + ball.radius > paddleY &&
      ball.y - ball.radius < canvasHeight
    );
  }

  function ballHitsBlock(ball, blocks) {
    const blockWidth = 41;
    const blockHeight = 30;
    const blockPadding = 20;
    const blockOffsetTop = 20;
    const blockOffsetLeft = 20;

    for (let i = 0; i < blocks.length; i++) {
      for (let j = 0; j < blocks[i].length; j++) {
        if (blocks[i][j]) {
          const blockX = j * (blockWidth + blockPadding) + blockOffsetLeft;
          const blockY = i * (blockHeight + blockPadding) + blockOffsetTop;

          // Define the edges of the ball
          const ballLeftEdge = ball.x - ball.radius;
          const ballRightEdge = ball.x + ball.radius;
          const ballTopEdge = ball.y - ball.radius;
          const ballBottomEdge = ball.y + ball.radius;

          // Check if the ball's edges intersect with the block
          if (
            ballRightEdge > blockX &&
            ballLeftEdge < blockX + blockWidth &&
            ballBottomEdge > blockY &&
            ballTopEdge < blockY + blockHeight
          ) {
            blocks[i][j] = false; // Block destroyed

            return true; // Collision detected
          }
        }
      }
    }
    return false; // No collision detected
  }

  // Game loop function
  function gameLoop(state) {
    const canvasWidth = 1500;
    const canvasHeight = 700;
    const ballRadius = 5;

    state.players.forEach((player, index) => {
      const paddleMoveSpeed = 8; // Adjust this speed as needed

      if (player.movingLeft) {
        player.paddlePos = Math.max(player.paddlePos - paddleMoveSpeed, 0);
      }
      if (player.movingRight) {
        player.paddlePos = Math.min(player.paddlePos + paddleMoveSpeed, 1500 / 2 - 75);
      }

      if (!player.ball) {
        console.error("Ball object not found for player", index);
        return; // Skip this iteration
      }
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

      checkCollisions(state);

      checkGameOver(state);
    });

    // Emit the updated state to both players
    io.to(state.roomID).emit("game-state", state);
  }

  function checkCollisions(state) {
    state.players.forEach((player) => {
      if (ballHitsPaddle(player.ball, player)) {
        player.ball.vy *= -1; // Reverse ball direction
      }

      if (ballHitsBlock(player.ball, player.blocks)) {
        player.ball.vy *= -1; // Reverse ball direction
        // Optionally add logic to update the score or game state
      }
    });
  }

  function checkGameOver(state) {
    if (state.players.some((player) => player.blocks.every((row) => row.every((block) => !block)))) {
      // All blocks are cleared, the game is over
      endGame(state);
    }
  }

  function endGame(state) {
    clearInterval(gameIntervals[state.roomID]); // Stop the game loop
    io.to(state.roomID).emit("game-over", { message: "Game over!" });
    delete gameStates[state.roomID]; // Clean up the game state
    delete gameIntervals[state.roomID]; // Clean up the game interval
  }

  // Function called when the game starts
  function startGame(roomID, playerSockets) {
    const state = createGameState(roomID);

    state.players[0].id = playerSockets[0];

    if (playerSockets[1]) {
      // Multiplayer game
      state.players[1].id = playerSockets[1];
    }

    state.roomID = roomID;
    io.to(roomID).emit("game-started", {
      message: "The game is about to begin!",
    });
    // Broadcast initial game state
    io.to(roomID).emit("game-state", state);
    // Start the game loop
    setInterval(() => gameLoop(state), 1000 / 200); // Run at 60 fps
  }

  function handleConnection(socket) {
    socket.on("join-game", () => {
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
