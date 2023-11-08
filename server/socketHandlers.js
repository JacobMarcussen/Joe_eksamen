module.exports = (io) => {
  const rooms = {};

  function handleConnection(socket) {
    socket.on("join-room", (roomID) => {
      if (!rooms[roomID]) {
        rooms[roomID] = {
          players: [],
          // Add more room-related data if needed
        };
      }

      // Only allow two players per room
      if (rooms[roomID].players.length < 2) {
        socket.join(roomID);
        rooms[roomID].players.push(socket.id);

        // Notify the player that they have joined the room
        socket.emit("message", `Welcome to room ${roomID}. Waiting for an opponent...`);

        // If two players are now in the room, start the game
        if (rooms[roomID].players.length === 2) {
          // Notify both players that the game is starting
          io.to(roomID).emit("message", "Game is starting...");

          // Start the game for this room
          startGame(roomID, rooms[roomID].players);
        }
      } else {
        // Notify user that the room is full
        socket.emit("message", "Room is full.");
      }
    });

    socket.on("disconnect", () => {
      // Handle disconnection logic and room cleanup
      Object.keys(rooms).forEach((roomID) => {
        const room = rooms[roomID];
        const index = room.players.indexOf(socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          socket.leave(roomID);

          // Notify the remaining player that their opponent left
          if (room.players.length === 1) {
            const remainingPlayerId = room.players[0];
            io.to(remainingPlayerId).emit("message", "Your opponent left the game.");
          } else if (room.players.length === 0) {
            // If the room is empty, delete it
            delete rooms[roomID];
          }
        }
      });
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
