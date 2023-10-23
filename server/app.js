const express = require("express");
const path = require("path");

const app = express();

// const http = require("http").Server(app);
// const io = require("socket.io")(http);

// Pinger
// const http = require("http");

// function pingServer() {
//   const startTime = Date.now();
//   http.get("http://164.92.232.145", (res) => {
//     const endTime = Date.now();
//     const rtt = endTime - startTime;
//     console.log(`RTT: ${rtt} ms`);
//   });
// }

// setInterval(pingServer, 1000); // Ping server hvert sekund

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

//Tror http er så socket.io virker? - Kan ikke køre på samme tid som app.listen

// http.listen(port, "localhost", () => {
//   console.log(`Socket.IO server running at http://localhost:${port}/`);
// });
