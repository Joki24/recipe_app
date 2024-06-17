//index.js
const express = require('express');
const axios = require('axios');
const ejs = require('ejs');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');

console.log('__dirname:', __dirname); // Check the current directory of index.js
console.log('Resolved views path:', path.join(__dirname, 'views')); // Check the resolved views path

require('dotenv').config();
const session = require('express-session');

const app = express();
const key_api = process.env.KEY_API;

// Generate a strong secret using crypto
const sessionSecret = crypto.randomBytes(64).toString('hex');

// Create a new client instance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

// Connect to the database
pool.connect((err, client, done) => {
    if (err) {
      console.error('Error connecting to the database:', err.stack);
    } else {
      console.log('Connected to the database');
    }
  });

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'https://spoonacular.com', 'https://img.spoonacular.com']
        }
    }
}));

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Only secure in production
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.get('/', (req, res) => {
    console.log('Received request for homepage');
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/test-ejs', (req, res) => {
    res.render('test-ejs'); // Ensure there's a 'test-ejs.ejs' file in the 'views' directory
});


app.post('/search', async (req, res) => {
    const {query} = req.body;
    try {
        const response = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?query=${query}&apiKey=${key_api}`);
        const recipes = response.data.results;
        res.render('results', { recipes  });
    } catch (error) {
        res.status(500).send("Error fetching data from Spoonacular API.");
    }
});

app.post('/searchByIngredients', async (req, res) => {
    const {ingredients} = req.body;
    try {
        const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&apiKey=${key_api}`);
        const recipes = response.data;
        res.render('results', {recipes});
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).send("Error fetching recipes.");
    }
});


app.get('/recipe/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${key_api}`);
        const recipe = response.data;
        res.render('recipe', { recipe });
    } catch (error) {
        console.error("Error fetching recipe information:", error);
        res.status(500).send("Error fetching recipe information from Spoonacular API.");
    }
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if username or email already exists in the database
        const existingUserQuery = 'SELECT * FROM users WHERE username = $1 OR email = $2';
        const existingUserResult = await pool.query(existingUserQuery, [username, email]);

        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const newUserQuery = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)';
        const newUserResult = await pool.query(newUserQuery, [username, email, hashedPassword]);
        
        const id = newUserResult.rows[0].id;

        // Store user ID in session
        req.session.userId = id;

        // Redirect to profile page
        res.redirect(`/profile/${id}`);
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt with email: ${email}`);

    try {
        const userQuery = 'SELECT * FROM users WHERE email = $1';
        const userResult = await pool.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            console.log('Invalid email');
            return res.status(400).json({ message: 'Invalid email or password'})
        }

        const user = userResult.rows[0];
        console.log('User found:', user);

        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('Invalid password');
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Store user ID in session
        req.session.userId = user.id;

        console.log('Login successful');
        // Redirect to profile page
        res.redirect(`/profile/${user.id}`);
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

app.get('/profile/:id', async (req, res, next) => {
    const id = req.params.id;
    console.log(`Fetching profile for user ID: ${id}`);

    try {
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const {rows} = await pool.query(userQuery, [id]);

        if (rows.length === 0) {
            console.log('User not found');
            return res.status(404).json({message: 'User not found'})
        }

        const user = rows[0];
        console.log('User profile:', user);
        res.render('profile', {user});
    } catch (error) {
        console.error("Error fetching user profile:", error);
        next(error); // Pass the error to the error handling middlewar
    }
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows);
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).send('Database connection error');
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});

// Close the database connection when the server is shutting down
process.on('SIGINT', async () => {
    try {
        await pool.end();
        console.log('Database connection closed');
        process.exit(1);
    } catch (error) {
        console.error('Error closing database connection:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    try {
        await pool.end();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error closing database connection:', error);
        process.exit(1);
    }
});
