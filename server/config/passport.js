const crypto = require("crypto");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");

passport.use(
  "local_signup",
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: true,
    },
    (req, username, password, done) => {
      const email = req.body.email;
      const phone = req.body.phone;
      console.log(username, password, email, phone);

      // Check if a user with the same username already exists in the database
      db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, user) => {
          if (err) {
            return done(err);
          }

          if (user) {
            return done(null, false, {
              message: "Username is already in use.",
            });
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
                return done(err);
              }

              // Retrieve the newly inserted user to pass to the next step
              db.get(
                "SELECT * FROM users WHERE username = ?",
                [username],
                (err, newUser) => {
                  if (err) {
                    return done(err);
                  }
                  return done(null, newUser);
                }
              );
            }
          );
        }
      );
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Replace with your logic to find the user by ID
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
    done(err, user);
  });
});

module.exports = passport;
