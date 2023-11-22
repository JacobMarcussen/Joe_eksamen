const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
require("dotenv").config();

// const SECRET_KEY = process.env.SECRET_KEY;

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
