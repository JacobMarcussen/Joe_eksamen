const express = require("express");
const path = require("path");

const app = express();

// const http = require("http").Server(app);
// const io = require("socket.io")(http);

// Middlewares

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

// Send client files from server

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/index.html"));
});

//Starter server
const port = 5000;

app.listen(port, () => {
  console.log(`Server open on port ${port}`);
});

//Tror http er så socket.io virker?

// http.listen(port, "localhost", () => {
//   console.log(`Socket.IO server running at http://localhost:${port}/`);
// });
