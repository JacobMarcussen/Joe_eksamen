module.exports = (io) => {
  const waitingPlayers = []; // Queue of players waiting to be paired

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

  function startGame(roomID, players) {
    // Implement your game logic here to start the 1v1 game
    // For now, we just notify the players that the game has started
    io.to(roomID).emit("game-started", "Let the game begin!");
    // Add more game-specific logic and event handling here
    // A function to initialize a new game state
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

    // A function to create initial blocks
    function createBlocks() {
      // Create and return a 2D array representing blocks
    }

    // Main game loop
    function gameLoop(state) {
      if (!state) {
        return;
      }

      // Update game state, move ball, check for collisions, etc.
      // Update paddle positions based on player input

      // Check for line destruction and add to opponent's game if necessary

      // Emit the state to both players
      io.to(state.roomID).emit("game-state", state);
    }

    // Function called when the game starts
    function startGame(roomID, players) {
      const state = createGameState();
      state.roomID = roomID;
      setInterval(() => gameLoop(state), 1000 / 60); // Run at 60 fps
    }
    startGame(); // Set up the rest of the server to handle connections, disconnections, and input
  }

  return {
    handleConnection,
  };
};
