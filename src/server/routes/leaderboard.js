const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Sender leaderboard data til database
router.post("/leaderboard", (req, res) => {
  const SECRET_KEY = process.env.SECRET_KEY;
  const token = req.cookies.session_token;
  const decoded = jwt.verify(token, SECRET_KEY);
  const username = decoded.username;
  const { winner } = req.body;
  if (username === winner) {
    db.run("UPDATE users SET gameScore = gameScore + 1 WHERE username = ?", [winner], (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("Score updated successfully for user:", winner);
      }
    });
  } else {
    console.log("Wrong user!");
    res.status(404).json({ message: "Wrong user!" });
  }
});

// Henter leaderboard data fra databasen
router.get("/leaderboard", (req, res) => {
  db.all("SELECT username, gameScore FROM users ORDER BY gameScore DESC LIMIT 10", (err, users) => {
    if (err) {
      throw err;
    }
    if (users.length > 0) {
      return res.status(200).json({ users });
    } else {
      return res.status(404).json({ message: "No users found" });
    }
  });
});

module.exports = router;
