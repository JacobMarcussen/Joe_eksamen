const express = require("express");
const router = express.Router();
// const passport = require("passport");
// require("../config/passport");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const crypto = require("crypto");

// Signup route
router.post("/signup", (req, res) => {
  const { username, password, email, phone } = req.body;

  // Check if a user with the same username already exists in the database
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }

    if (user) {
      return res.status(400).json({ message: "Username is already in use." });
    }

    // Hash the password using a hashing algorithm
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Insert the new user into the database
    db.run(
      "INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, email, phone],
      (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to register user." });
        }

        // Retrieve the newly inserted user
        db.get(
          "SELECT * FROM users WHERE username = ?",
          [username],
          (err, newUser) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Failed to retrieve user." });
            }
            res.status(200).json(newUser); // Success
          }
        );
      }
    );
  });
});

module.exports = router;
