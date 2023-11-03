const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const bcrypt = require("bcrypt");

// Login route
router.post("/login", (req, res) => {
  const { password, email } = req.body;
  console.log(password, email);

  // Retrieve the user from the database based on their email
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) {
      return res.status(500).send("Internal Server Error");
    }

    if (!user) {
      return res.status(401).send("User not found.");
    }

    console.log(user.password);
    // Compare the provided password with the hashed password in the database using bcrypt
    bcrypt.compare(password, user.password, (compareErr, isMatch) => {
      if (compareErr) {
        return res.status(500).send("Internal Server Error");
      }

      if (!isMatch) {
        return res.status(401).send("Invalid email or password.");
      }

      // Set up a session and store user data in the session
      res.cookie("user_id", user.id, { maxAge: 900000 }); // Set an expiration time for the cookie (e.g., 15 minutes)
      res.redirect("/dashboard");
    });
  });
});

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

    // Hash the password using bcrypt
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        return res.status(500).json({ message: "Failed to hash password." });
      }

      // Insert the new user into the database with the hashed password
      db.run(
        "INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, email, phone],
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to register user." });
          }

          // Retrieve the newly inserted user
          db.get("SELECT * FROM users WHERE username = ?", [username], (err, newUser) => {
            if (err) {
              return res.status(500).json({ message: "Failed to retrieve user." });
            }
            res.status(200).json(newUser); // Success
          });
        }
      );
    });
  });
});

module.exports = router;
