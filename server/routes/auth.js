const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;
const twilioClient = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

    if (!user.isUserAuth) {
      return res.status(401).send("User is not authenticated. Please confirm your phone number first.");
    }

    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            username: user.username,
            isAuth: user.isUserAuth,
            gameScore: user.gameScore,
          },
          SECRET_KEY,
          { expiresIn: "1h" }
        );

        res.cookie("session_token", token, { httpOnly: true, maxAge: 3600000 });
        res.cookie("current_user", user.username, { httpOnly: false, maxAge: 3600000 });

        res.json({ message: "Login successful" });
      } else {
        return res.status(401).send("Invalid email or password");
      }
    });
  });
});

// Confirm and authorize user route
router.post("/confirm", (req, res) => {
  const { code } = req.body;
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(403).json({ message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userEmail = decoded.email;

    db.get("SELECT * FROM users WHERE email = ?", [userEmail], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (user.authenticatorCode === code) {
        db.run("UPDATE users SET isUserAuth = ? WHERE id = ?", [true, user.id], function (updateErr) {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
          } else {
            if (this.changes > 0) {
              res.status(200).json({ message: "User confirmed successfully." });
            } else {
              res.status(404).json({ error: "User not found." });
            }
          }
        });
      } else {
        res.status(401).json({ error: "Invalid code." });
      }
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
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

    //Hasher password med 10 salt rounds
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        return res.status(500).json({ message: "Failed to hash password." });
      }

      const authenticatorCode = Math.floor(1000 + Math.random() * 9000);

      db.run(
        "INSERT INTO users (username, password, email, phone, authenticatorCode, isUserAuth, gameScore) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [username, hashedPassword, email, phone, authenticatorCode, false, 0],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ message: "Failed to register user." });
          }

          const token = jwt.sign({ email: email }, SECRET_KEY, { expiresIn: "1h" });
          res.cookie("auth_token", token, { httpOnly: true });

          twilioClient.messages
            .create({
              body: `Your verification code is: ${authenticatorCode}`,
              from: "JoeJuice",
              to: "+45" + phone,
            })
            .then((message) => {
              res.status(200).json({ message: "User registered, verification code sent." });
            })
            .catch((smsError) => {
              console.error("Could not send SMS:", smsError);
              res.status(500).json({ message: "User registered but failed to send verification code." });
            });
        }
      );
    });
  });
});

// Log-out route
router.post("/logout", (req, res) => {
  if (req.body.confirmation === true) {
    res.clearCookie("session_token");
    res.clearCookie("current_user");
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
      res.clearCookie("session_token");
      res.clearCookie("current_user");
      res.status(204).send();
    }
  });
});

module.exports = router;
