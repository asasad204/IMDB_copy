const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config();

// Provjera da li postoji cookie
const checkCookieMiddleware = (req, res, next) => {
  const cookieValue = req.session.korisnikID; // Replace 'yourCookieName' with the actual cookie name

  // Check if the cookie exists
  if (cookieValue) {
    // If the cookie exists, you can do something with its value or continue to the next middleware
    console.log('Cookie found:', cookieValue);
    return true;
  } else {
    // If the cookie doesn't exist, you can redirect to a login page or perform other actions
    console.log('Cookie not found. Redirecting to login page.');
    res.redirect('/login'); // Replace '/login' with the actual login route
    return false;
  }
};

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  max: 100,
  idleTimeoutMillis: 3000
});

router.get('/', function (req, res, next) {
  const uloga = req.session.uloga;
  if (!checkCookieMiddleware(req, res, next)) {
    return; // Do not proceed if the cookie is not present
  }

  const cookieValue = req.session.korisnikID;
  const queryText = `SELECT f.* FROM korisnik_film kf
                     JOIN filmovi f ON kf.film_id = f.id
                     WHERE kf.korisnik_id = $1`;

  pool.query(queryText, [cookieValue], (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return res.status(500).send('Internal Server Error');
    }

    res.render('watchlist', { filmovi: result.rows , isAdmin:uloga});
  });
});

router.post('/checkWatchlist/:filmId', (req, res) => {
  const filmId = req.params.filmId;

  pool.connect((err, client, done) => {
    if (err) {
      done();
      return res.status(500).json({ error: 'Error connecting to the database: ' + err });
    }

    client.query('SELECT 1 FROM korisnik_film kf WHERE kf.film_id = $1', [filmId], (err, result) => {
      done();

      if (err) {
        return res.status(500).json({ error: 'Error querying the database: ' + err });
      }

      const isInWatchlist = result.rows.length > 0;
      res.json({ isInWatchlist });
    });
  });
});

module.exports = router;
