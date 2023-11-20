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
        { paddlePos: 375, score: 0, blocks: createBlocks(), ball: { x: 375, y: 350, vx: 5, vy: 5, radius: 5 } },
        { paddlePos: 375, score: 0, blocks: createBlocks(), ball: { x: 375, y: 350, vx: 5, vy: 5, radius: 5 } },
      ],
    };

    // Store the new state in the gameStates object
    gameStates[roomID] = newState;
    return newState;
  }

  // Placeholder collision detection functions
  function ballHitsPaddle(ball, paddle) {
    return false;
  }

  function ballHitsBlock(ball, block) {
    // Implement collision detection logic here
    return false;
  }

  // Game loop function
  function gameLoop(state) {
    const canvasWidth = 1500;
    const canvasHeight = 700;
    const ballRadius = 5;

    state.players.forEach((player, index) => {
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
      if (ballHitsPaddle(state.ball, player.paddle)) {
        state.ball.vy *= -1; // Reverse ball direction
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
    setInterval(() => gameLoop(state), 1000 / 60); // Run at 60 fps
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
      // Determine which player sent the action
      const roomID = findRoomIDBySocketID(socket.id); // Implement this function based on your room management logic
      const state = gameStates[roomID];
      if (!state) {
        console.error("No game state found for room:", roomID);
        return;
      }
      const player = state.players.find((p) => p.id === socket.id);
      if (!player) {
        console.error("Player not found for action:", action);
        return; // Player not found, exit early
      }
      // Handle the movement action, update the player's paddle position
      if (action.type === "move") {
        const gameWidth = 1500;
        const paddleWidth = 100;
        if (action.direction === "ArrowLeft") {
          player.paddlePos = Math.max(player.paddlePos - 10, 0);
        } else if (action.direction === "ArrowRight") {
          player.paddlePos = Math.min(player.paddlePos + 10, gameWidth / 2 - paddleWidth);
        }

        player.paddlePos = Math.max(Math.min(player.paddlePos, gameWidth - paddleWidth), 0);
      }
      io.to(roomID).emit("game-state", state);
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
