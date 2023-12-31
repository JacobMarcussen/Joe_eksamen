const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT, phone TEXT, authenticatorCode TEXT, isUserAuth BOOLEAN, gameScore INTEGER)"
  );
  // Nedenstående linje sletter databasen. Fjern udkommentering for at eksekvere
  // db.run("DROP TABLE IF EXISTS users");
});

// Auth sikrer at brugeren er på den korrekte side hvis de er logget ind og redirecter til login siden hvis de ikke er logget ind
function checkAuthentication(req, res, next) {
  if (!!req.cookies.session_token) {
    const SECRET_KEY = process.env.SECRET_KEY;
    const token = req.cookies.session_token;
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.isAuth) {
      if (req.path == "/game") {
        next();
      } else if (req.path !== "/dashboard") {
        res.redirect("/dashboard");
      } else {
        next();
      }
    }
  } else {
    if (req.path == "/signup") {
      next();
    } else if (req.path == "/confirm") {
      next();
    } else if (req.path !== "/login") {
      setTimeout(() => {
        res.redirect("/login");
      }, 1000);
    } else {
      next();
    }
  }
}

const protectViewsRoute = (req, res, next) => {
  if (req.url.startsWith("/views")) {
    checkAuthentication(req, res, next);
    return res.status(403).send("Access denied");
  }
  next();
};

// Middlewares
app.use(protectViewsRoute);
app.use(express.static(path.join(__dirname, "../client")));

app.get("/login", checkAuthentication, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/login.html"));
});

app.get("/signup", checkAuthentication, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/signup.html"));
});

app.get("/dashboard", checkAuthentication, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/index.html"));
});

app.get("/game", checkAuthentication, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/game.html"));
});

app.get("/confirm", checkAuthentication, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/confirmPhone.html"));
});

app.get("/", checkAuthentication, (req, res) => {
  res.redirect("/login");
});

//Importing routes
const authRoutes = require("../server/routes/auth.js");
app.use("/auth", authRoutes);

const leaderboardRoutes = require("../server/routes/leaderboard.js");
app.use("/", leaderboardRoutes);

const socketHandlers = require("../server/socketHandlers.js")(io);
io.on("connection", (socket) => {
  console.log("A user connected");
  socketHandlers.handleConnection(socket);
});

//Starter server
const port = 8000;

http.listen(port, () => {
  console.log(`Server open on port ${port}`);
});
