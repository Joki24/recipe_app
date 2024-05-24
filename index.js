//index.js
const express = require('express');
const axios = require('axios');
const ejs = require('ejs');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Create a new client instance
const pool = new Pool({
    user: 'macbook',
    host: 'localhost',
    database: 'recipe_app',
    port: 5432,
  });

// Connect to the database
pool.connect()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Error connecting to the database:', error);
  });

const app = express();
const key_api = "95f8ddc9bbfd47149999562e49e41259";

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

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/search', async (req, res) => {
    const {query} = req.body;
    try {
        const response = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?query=${query}&apiKey=${key_api}`);
        const recipes = response.data.results;
        res.render('results', {recipes});
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
        await pool.query(newUserQuery, [username, email, hashedPassword]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

// Close the database connection when the server is shutting down
process.on('SIGINT', async () => {
    try {
        await pool.end();
        console.log('Database connection closed');
        server.close(() => {
            console.log('Server shut down');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error closing database connection:', error);
        process.exit(1);
    }
});
