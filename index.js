// index.js
const express = require("express");
const axios = require("axios");
const ejs = require("ejs");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();
const session = require("express-session");
const pgSession = require('connect-pg-simple')(session);

const app = express();
const key_api = process.env.KEY_API;

// Generate a strong secret using crypto or from env
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString("hex");

// Create a new client instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// // Connect to the database
// pool.connect((err, client, done) => {
//   if (err) {
//     console.error("Error connecting to the database:", err.stack);
//   } else {
//     console.log("Connected to the database");
//   }
// });

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://kit.fontawesome.com", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome", "https://stackpath.bootstrapcdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://stackpath.bootstrapcdn.com", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css", "https://fonts.googleapis.com", "https://ka-f.fontawesome.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts", "https://kit-free.fontawesome.com", "https://ka-f.fontawesome.com"],
      imgSrc: ["'self'", "data:", "https://img.spoonacular.com"],
      connectSrc: ["'self'", "https://api.spoonacular.com", "https://ka-f.fontawesome.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"]
    },
  },
  reportOnly: false // Set to true if you're testing/reporting violations without blocking
}));

app.set('trust proxy', 1); // Trust first proxy (Heroku-specific)

// app.use(session({
//   secret: sessionSecret,
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: process.env.NODE_ENV === "production" }
// }));

// Configure session store with PostgreSQL
app.use(session({
  store: new pgSession({
    pool: pool, // Connection pool
    tableName: 'session' // Use a specific table for storing sessions
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// app.use(express.static("public", { 
//   setHeaders: (res, path, stat) => {
//     res.set('Content-Type', 'text/css');
//   }
// }));

app.use(express.static(path.join(__dirname, '/public')));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Routes
app.get("/", (req, res) => {
  console.log("Received request for homepage");
  res.render("index");
});

app.post("/", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt with email: ${email}`);

  try {
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      console.log("Invalid email");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];
    console.log("User found:", user);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Invalid password");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    req.session.userId = user.id;
    console.log("Login successful");

    res.redirect(`/profile/${user.id}`);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

app.get('/explore', async (req, res) => {
  try {
    console.log("Fetching 'Need to try' recipes...");
    // Fetch "Need to try" recipes
    const needToTryResponse = await axios.get(`https://api.spoonacular.com/recipes/random?number=3&apiKey=${key_api}`);
    const needToTryRecipes = needToTryResponse.data.recipes;
    console.log("Fetched 'Need to try' recipes:", needToTryRecipes);

    console.log("Fetching 'Summer selection' recipes...");
    // Fetch "Summer selection" recipes
    const summerSelectionResponse = await axios.get(`https://api.spoonacular.com/recipes/random?number=3&tags=summer&apiKey=${key_api}`);
    const summerSelectionRecipes = summerSelectionResponse.data.recipes;
    console.log("Fetched 'Summer selection' recipes:", summerSelectionRecipes);

    console.log("Need to try recipes:", needToTryRecipes);
    console.log("Summer selection recipes:", summerSelectionRecipes);

    res.render('mainPage', {
      needToTryRecipes,        // Ensure needToTryRecipes is passed to the template
      summerSelectionRecipes
    });
  } catch (error) {
    console.error("Error fetching data from Spoonacular API:", error);
    res.status(500).send("Error fetching data from Spoonacular API.");
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("loginauth");
});

app.get("/test-ejs", (req, res) => {
  res.render("test-ejs"); // Ensure there's a 'test-ejs.ejs' file in the 'views' directory
});

app.post('/report-violation', (req, res) => {
  if (req.body) {
    console.error('CSP Violation:', req.body);
  } else {
    console.error('CSP Violation: No data received!');
  }
  res.status(204).end();
});

app.post("/search", async (req, res) => {
  const { query } = req.body;
  try {
    const response = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?query=${query}&apiKey=${key_api}`);
    const recipes = response.data.results;
    res.render("results", { recipes });
  } catch (error) {
    console.error("Error fetching data from Spoonacular API:", error);
    res.status(500).send("Error fetching data from Spoonacular API.");
  }
});

app.post("/searchByIngredients", async (req, res) => {
  const { ingredients } = req.body;
  try {
    const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&apiKey=${key_api}`);
    const recipes = response.data;
    res.render("results", { recipes });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).send("Error fetching recipes.");
  }
});

app.get("/recipe/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${key_api}`);
    const recipe = response.data;
    res.render("recipe", { recipe });
  } catch (error) {
    console.error("Error fetching recipe information:", error);
    res.status(500).send("Error fetching recipe information from Spoonacular API.");
  }
});

app.post('/report-violation', (req, res) => {
  if (req.body) {
    console.error('CSP Violation:', req.body);
  } else {
    console.error('CSP Violation: No data received!');
  }
  res.status(204).end();
});


app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if username or email already exists in the database
    const existingUserQuery = "SELECT * FROM users WHERE username = $1 OR email = $2";
    const existingUserResult = await pool.query(existingUserQuery, [username, email]);

    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database and return the ID
    const newUserQuery = "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id";
    const newUserResult = await pool.query(newUserQuery, [username, email, hashedPassword]);
    const id = newUserResult.rows[0].id;

    // Store user ID in session
    req.session.userId = id;

    // Redirect to profile page
    res.redirect(`/profile/${id}`);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt with email: ${email}`);

  try {
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      console.log("Invalid email");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];
    console.log("User found:", user);

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Invalid password");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Store user ID in session
    req.session.userId = user.id;
    console.log("Login successful");
    console.log(`${req.session.userId}`)


    // Redirect to profile page
    res.redirect(`/profile/${user.id}`);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login"); // Redirect to login if not authenticated
};

app.get("/profile/:id", isAuthenticated, async (req, res, next) => {
  const id = req.params.id;
  try {
    const userQuery = "SELECT * FROM users WHERE id = $1";
    const { rows } = await pool.query(userQuery, [id]);

    if (rows.length === 0) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    console.log("User profile:", user);
    res.render("profile", { user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    next(error); // Pass the error to the error handling middleware
  }
});

app.post("/profile/update", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { username, email } =  req.body;

  try {
    const updateUserQuery = "UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING *";
    const updatedUser = await pool.query(updateUserQuery, [username, email, userId]);
        
    // Update user information stored in session
    req.session.username = updatedUser.rows[0].username;
    req.session.email = updatedUser.rows[0].email;
        
    res.redirect(`/profile/${userId}`);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});

app.post("/profile/change-password", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { currentPassword, newPassword } = req.body;

  try {
    const userQuery = "SELECT * FROM users WHERE id = $1";
    const userResult = await pool.query(userQuery, [userId]);
        
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
        
    const user = userResult.rows[0];

    // Compare current password with hashed password in the database
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password in the database
    const updatePasswordQuery = "UPDATE users SET password = $1 WHERE id = $2";
    await pool.query(updatePasswordQuery, [hashedPassword, userId]);

    res.redirect(`/profile/${userId}`);
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Error changing password", error: error.message });
  }
}
);

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to logout.");
    }
    res.redirect("/login");
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).send("Database connection error");
  }
});

// 404 Error handler
app.use((req, res) => {
  res.status(404).send("Page not found");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown for database connection
process.on("SIGINT", async () => {
  try {
    await pool.end();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error closing database connection:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  try {
    await pool.end();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error closing database connection:", error);
    process.exit(1);
  }
});
