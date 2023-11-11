const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT, phone TEXT, authenticatorCode TEXT, isUserAuth BOOLEAN)"
  );
  // db.run("DROP TABLE IF EXISTS users");
});

// Auth
function checkAuthentication(req, res, next) {
  if (!!req.cookies.session_token) {
    if (req.path == "/game") {
      next();
    } else if (req.path !== "/dashboard") {
      res.redirect("/dashboard");
    } else {
      next();
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
