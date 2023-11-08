const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const bcrypt = require("bcrypt");

// Login route
router.post("/login", (req, res) => {
  const { password, email } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) {
      return res.status(500).send("Internal Server Error");
    }

    if (!user) {
      return res.status(401).send("User not found.");
    }

    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        res.cookie("user_id", user.id, { maxAge: 900000 });
        res.redirect("/dashboard");
      } else {
        return res.status(401).send("Invalid email or password");
      }
    });
  });
});

// Signup route
router.post("/signup", (req, res) => {
  const { username, password, email, phone } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }

    if (user) {
      return res.status(400).json({ message: "Username is already in use." });
    }

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        return res.status(500).json({ message: "Failed to hash password." });
      }

      db.run(
        "INSERT INTO users (username, password, email, phone, authenticatorCode) VALUES (?, ?, ?, ?, ?)",
        [username, hashedPassword, email, phone],
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to register user." });
          }

          db.get("SELECT * FROM users WHERE username = ?", [username], (err, newUser) => {
            if (err) {
              return res.status(500).json({ message: "Failed to retrieve user." });
            }
            res.status(200).json(newUser);
          });
        }
      );
    });
  });
});

router.post("/logout", (req, res) => {
  if (req.body.confirmation === true) {
    res.clearCookie("user_id");
    res.status(204).send();
  } else {
    res.status(400).json({ error: "Confirmation required" });
  }
});

router.delete("/deleteUser", (req, res) => {
  const userId = req.cookies.user_id;
  const deleteUserQuery = "DELETE FROM users WHERE id = ?";
  db.run(deleteUserQuery, [userId], (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to delete user" });
    } else {
      res.clearCookie("user_id");
      res.status(204).send();
    }
  });
});

module.exports = router;
