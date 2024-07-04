Fooodiz - Recipe App

Description
Fooodiz is a web application designed to help users discover new meal ideas. Whether you're looking for quick weekday dinners or special weekend treats, Fooodiz provides a variety of recipes to suit your taste.

Table of Contents
1. Deployment
2. Installation
3. Usage
4. API Integration
5. Technologies Used
6. Contributing
7. License

1. Deployment
You can access the deployed version of the app on Heroku: Fooodiz on Heroku (https://recipe-app-jk-56017cda17e9.herokuapp.com/)

2. Installation
To run the Recipe App locally, follow these steps:

1) Clone the repository:

    git clone https://github.com/your-username/recipe-app.git

2) Install dependencies:

npm install

3) Set up environment variables:

    * Create a .env file in the root directory.
    * Add the following environment variables:

    DB_HOST=your_database_host
    DB_USER=your_database_user
    DB_PASS=your_database_password
    DB_NAME=your_database_name
    SESSION_SECRET=your_session_secret

Replace placeholders like your-username, your_database_host, your_database_user, etc., with actual values specific to your project.

4) Start the application:

npm start

5) Open your browser and navigate to http://localhost:5000 to view the app.

3. Usage
    * Users can browse recipes by category.
    * Search for specific recipes by name or ingredient.
    * Register and log in to save favorite recipes.

4. API Integration
This app uses the Spoonacular API to fetch recipe data. Ensure you have a valid API key and include it in your .env file as SPOONACULAR_API_KEY.

5. Technologies Used
    * Node.js
    * Express.js
    * PostgreSQL
    * EJS (Embedded JavaScript)
    * Axios
    * Bcrypt
    * dotenv
    * Express Session
    * Helmet

6. Contributing
Contributions are welcome! Here's how you can contribute to this project:

1) Fork the repository.
2) Create a new branch (git checkout -b feature-branch).
3) Make your changes.
4) Commit your changes (git commit -am 'Add new feature').
5) Push to the branch (git push origin feature-branch).
6) Create a new Pull Request.

7. License
This project is licensed under the ISC License - see the LICENSE file for details.


