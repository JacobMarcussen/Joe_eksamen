module.exports = (io) => {
  const waitingPlayers = []; // Queue of players waiting to be paired

  // Function to create initial blocks
  function createBlocks() {
    let blocks = [];
    for (let i = 0; i < 6; i++) {
      // Example for 5 rows of blocks
      blocks[i] = [];
      for (let j = 0; j < 12; j++) {
        // Example for 8 blocks per row
        blocks[i][j] = true; // 'true' indicates a block is present
      }
    }
    return blocks;
  }

  // Function to initialize a new game state
  function createGameState() {
    // Define initial state
    return {
      players: [
        { paddlePos: 50, score: 0, blocks: createBlocks() },
        { paddlePos: 50, score: 0, blocks: createBlocks() },
      ],
      ball: { x: 50, y: 50, vx: 5, vy: 5 },
      // More game state if necessary
    };
  }

  // Game loop function
  function gameLoop(state) {
    // Update game state, move ball, check for collisions, etc.

    // Emit the state to both players
    io.to(state.roomID).emit("game-state", state);
  }

  // Function called when the game starts
  function startGame(roomID, players) {
    const state = createGameState();
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

        // Both players join the room
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

    socket.on("disconnect", () => {
      // Remove the socket from the waiting queue if it disconnects before pairing
      const index = waitingPlayers.indexOf(socket.id);
      if (index !== -1) {
        waitingPlayers.splice(index, 1);
      }
    });
  }

  return {
    handleConnection,
  };
};
