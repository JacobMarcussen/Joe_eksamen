const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const socketIo = require("socket.io");
const crypto = require("crypto");

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//Auth
function isAuthenticated(req, res, next) {
  if (req.cookies.user_id) {
    // User is logged in, allow access to the route
    next();
  } else {
    res.status(401).send("Unauthorized");
  }
}

//Database

const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT, phone TEXT)"
  );
});

// Middlewares

app.use(express.static(path.join(__dirname, "../client")));

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/signup.html"));
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  // Render the dashboard HTML page
  res.sendFile(path.join(__dirname, "../client/views/index.html"));
});

//Importing routes

const authRoutes = require("../server/routes/auth.js");
app.use("/auth", authRoutes);

//Starter server
const port = 8000;

const server = http.createServer(app); // Create an HTTP server
const io = socketIo(server); // Create a Socket.io instance using the HTTP server

app.listen(port, () => {
  console.log(`Server open on port ${port}`);
});
