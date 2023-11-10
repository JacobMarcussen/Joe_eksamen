const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_secret_key";
const twilioClient = require("twilio")(
  "AC89d27f48eb2c7ba200998c9ce20518e3",
  "75c9b67af681e8e78e551b86e021607e"
);

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

router.post("/confirm", (req, res) => {
  const { code } = req.body;
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(403).json({ message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userEmail = decoded.email;

    // Now fetch the user from the database using the email from the token
    db.get("SELECT * FROM users WHERE email = ?", [userEmail], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (user.authenticatorCode === code) {
        db.run(
          "UPDATE users SET isUserAuth = ? WHERE id = ?",
          [true, user.id],
          function (updateErr) {
            if (updateErr) {
              // Handle error - could not update the user
              res.status(500).json({ error: updateErr.message });
            } else {
              // Check if the record was updated
              if (this.changes > 0) {
                // The user was updated successfully
                res.json({ message: "User confirmed successfully." });
              } else {
                // No records were updated - this should not happen if the user exists and the code was correct
                res.status(404).json({ error: "User not found." });
              }
            }
          }
        );
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

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        return res.status(500).json({ message: "Failed to hash password." });
      }

      const authenticatorCode = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit code

      db.run(
        "INSERT INTO users (username, password, email, phone, authenticatorCode, isUserAuth) VALUES (?, ?, ?, ?, ?, ?)",
        [username, hashedPassword, email, phone, authenticatorCode, false],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ message: "Failed to register user." });
          }

          // Now the user is inserted, send the token and the verification message
          const token = jwt.sign({ email: email }, SECRET_KEY, { expiresIn: "1h" });
          res.cookie("auth_token", token, { httpOnly: true });

          // Send SMS with Twilio
          twilioClient.messages
            .create({
              body: `Your verification code is: ${authenticatorCode}`,
              from: "JoeJuice", // Replace with your Twilio number
              to: phone,
            })
            .then((message) => {
              console.log("SMS sent:", message.sid);
              // Only send the success response after the SMS is sent
              res.status(200).json({ message: "User registered, verification code sent." });
            })
            .catch((smsError) => {
              console.error("Could not send SMS:", smsError);
              // Send a different response if SMS sending fails
              res
                .status(500)
                .json({ message: "User registered but failed to send verification code." });
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
