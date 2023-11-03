const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT, phone TEXT)"
  );
});

// Auth
function checkAuthentication(req, res, next) {
  if (!!req.cookies.user_id) {
    if (req.path !== "/dashboard") {
      res.redirect("/dashboard");
    } else {
      next();
    }
  } else {
    if (req.path !== "/login") {
      res.redirect("/login");
    } else {
      next();
    }
  }
}

// Middlewares
app.use(express.static(path.join(__dirname, "../client")));

app.use(checkAuthentication);

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/signup.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/views/index.html"));
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

//Importing routes
const authRoutes = require("../server/routes/auth.js");
app.use("/auth", authRoutes);

//Starter server
const port = 8000;

app.listen(port, () => {
  console.log(`Server open on port ${port}`);
});
