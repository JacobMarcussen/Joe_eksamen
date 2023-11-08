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
  }

  return {
    handleConnection,
  };
};
