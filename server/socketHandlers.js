module.exports = (io) => {
  const waitingPlayers = []; // Queue of players waiting to be paired

  function handleConnection(socket) {
    socket.on("join-game", () => {
      // When a player connects, add them to the waiting queue or pair them if possible
      if (waitingPlayers.length > 0) {
        const roomID = "room_" + socket.id; // Create a unique roomID
        const opponentSocketId = waitingPlayers.shift(); // Get the opponent from the waiting queue

        // Make a room for these two players
        const room = {
          players: [socket.id, opponentSocketId],
          // Add more room-related data if needed
        };

        // Join both players to the room
        socket.join(roomID);
        io.to(opponentSocketId).join(roomID);

        // Notify both players that the game is starting
        io.in(roomID).emit("message", "Game is starting...");

        // Start the game for this room
        startGame(roomID, room.players);
      } else {
        // No opponents waiting, so wait for one
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
