module.exports = (io) => {
  const waitingPlayers = []; // Queue of players waiting to be paired
  const gameStates = {};
  const socketToRoom = {};
  const gameIntervals = {}; // Store the intervals for each game

  // Function to create initial blocks
  function createBlocks() {
    let blocks = [];
    for (let i = 0; i < 3; i++) {
      // Example for 5 rows of blocks
      blocks[i] = [];
      for (let j = 0; j < 6; j++) {
        // Example for 8 blocks per row
        blocks[i][j] = true; // 'true' indicates a block is present
      }
    }
    return blocks;
  }

  // When creating a room or joining a room, you would set the mapping
  function joinRoom(socketId, roomID) {
    socketToRoom[socketId] = roomID;
  }

  // When leaving a room or disconnecting, you would delete the mapping
  function leaveRoom(socketId) {
    delete socketToRoom[socketId];
  }

  // This is how you could implement the findRoomIDBySocketID function
  function findRoomIDBySocketID(socketId) {
    return socketToRoom[socketId];
  }

  // Function to initialize a new game state
  function createGameState(roomID) {
    // Define initial state
    const newState = {
      // Initial state setup...
      players: [
        { paddlePos: 300, score: 0, blocks: createBlocks() },
        { paddlePos: 300, score: 0, blocks: createBlocks() },
      ],
      ball: { x: 50, y: 50, vx: 5, vy: 5 },
      // More game state if necessary
    };

    // Store the new state in the gameStates object
    gameStates[roomID] = newState;
    return newState;
  }

  // Placeholder collision detection functions
  function ballHitsPaddle(ball, paddle) {
    // Implement collision detection logic here
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
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // Collision detection for walls
    if (state.ball.x < 0 || state.ball.x > canvasWidth) {
      state.ball.vx *= -1; // Reverse the ball's horizontal velocity
    }
    if (state.ball.y < 0 || state.ball.y > canvasHeight) {
      state.ball.vy *= -1; // Reverse the ball's vertical velocity
    }

    checkCollisions(state);
    checkGameOver(state);

    // Emit the state to both players
    io.to(state.roomID).emit("game-state", state);
  }

  function checkCollisions(state) {
    // Pseudocode for collision detection
    state.players.forEach((player) => {
      if (ballHitsPaddle(state.ball, player.paddle)) {
        state.ball.vy *= -1; // Reverse ball direction
      }
    });

    state.players.forEach((player) => {
      player.blocks.forEach((block, index) => {
        if (block && ballHitsBlock(state.ball, block)) {
          player.blocks[index] = false; // Remove the block
          state.ball.vy *= -1; // Reverse ball direction
        }
      });
    });

    // Additional logic for what happens when all blocks are gone, game scoring, etc.
  }

  function checkGameOver(state) {
    // Pseudocode for game over conditions
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
        // Pseudocode: Adjust the paddle position based on the direction of movement
        if (action.direction === "ArrowLeft") {
          player.paddlePos -= 10; // Move left
        } else if (action.direction === "ArrowRight") {
          player.paddlePos += 10; // Move right
        }
        // Ensure the paddle stays within the game boundaries
        const gameWidth = 1500; // Replace with actual game width
        const paddleWidth = 100; // Replace with actual paddle width
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
