const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config();


const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  max: 100,
  idleTimeoutMillis: 3000
});



router.get('/filmovi', function (req, res, next) {
  const queryText = `SELECT * FROM filmovi`;
  const uloga = req.session.uloga;
  console.log(uloga);
  pool.query(queryText, (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return res.status(500).send('Internal Server Error');
    }

    res.render('index',{ filmovi: result.rows, isAdmin:uloga});
  });
});



//prikaz po zanru
router.get('/zanr/:naziv_zanra', function (req, res, next) {
  const genreName = req.params.naziv_zanra;

  // Get the genre ID based on the provided genre name
  const getGenreIdQuery = 'SELECT id FROM zanr WHERE naziv = $1';

  pool.query(getGenreIdQuery, [genreName], (genreQueryError, genreQueryResult) => {
    if (genreQueryError) {
      console.error('Error executing genre query', genreQueryError);
      return res.status(500).send('Internal Server Error');
    }

    if (genreQueryResult.rows.length === 0) {
      return res.status(404).send('Genre not found');
    }

    const genreId = genreQueryResult.rows[0].id;

    // Use the obtained genre ID in the main query
    const queryText = `SELECT  f.*
      FROM filmovi f
      JOIN zanr_film zf ON f.id = zf.id_filma
      JOIN zanr z ON zf.id_zanra = z.id
      WHERE z.id=$1`;

    pool.query(queryText, [genreId], (queryError, result) => {
      if (queryError) {
        console.error('Error executing query', queryError);
        return res.status(500).send('Internal Server Error');
      }

      res.render('index', { filmovi: result.rows });
    });
  });
});
router.get('/filtriraj', function (req, res, next) {
  const selectedValue = req.query.kriterij;

  // Depending on the selectedValue, modify your SQL query accordingly
  let queryText;

  switch (selectedValue) {
    case '1':
      queryText = `SELECT *
        FROM filmovi 
        ORDER BY datum_release DESC;`;
      break;
    case '2':
      queryText = `SELECT * 
        FROM filmovi 
        ORDER BY datum_release ASC;`;
      break;
    case '3':
      queryText = `SELECT *
        FROM filmovi 
        ORDER BY rating DESC;`;
      break;
    default:
      // Handle the default case or invalid values
      return res.status(400).send('Invalid value for kriterij');
  }

  pool.query(queryText, (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return res.status(500).send('Internal Server Error');
    }
    //console.log(result.rows);
    res.setHeader('Content-Type', 'application/json');
    res.json(result.rows);
  });
});
router.post('/dodaj/watchlist/:id', async function(req, res, next) {
  if (!req.session.korisnikID) {
    // If the user is not authorized, redirect to the login page
    return res.redirect('/login');
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query('INSERT INTO korisnik_film (korisnik_id, film_id) VALUES ($1, $2)', [req.session.korisnikID, req.params.id]);

    console.log('The film has been successfully added to the watchlist');
  } catch (err) {
    console.error('/dodaj/watchlist/:id', err);
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    if (client)
      client.release();
  }
});

router.post('/search', async (req, res) => {
  const searchTerm = req.body.searchTerm;
  const uloga = req.session.uloga;

  // Query the database for products containing the search term
  const query = {
    text: 'SELECT * FROM filmovi WHERE naziv ILIKE $1',
    values: [`%${searchTerm}%`],
  };

  try {
    const result = await pool.query(query);
    const filmovi = result.rows;
    res.render('index', { filmovi, isAdmin: uloga });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/admin', function(req,res,next){
  const uloga = req.session.uloga;
  if(uloga) res.render('admin');
  else res.redirect('/filmovi')
});

router.get('/zanr', function (req, res, next) {
  const selectedValue = req.query.kriterij;

  // Depending on the selectedValue, modify your SQL query accordingly
  const queryText = `SELECT  f.* FROM filmovi f JOIN zanr_film zf ON f.id = zf.id_filma JOIN zanr z ON zf.id_zanra = z.id WHERE z.id=$1`;
  console.log(queryText);
  console.log(selectedValue);
  pool.query(queryText, [selectedValue], (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return res.status(500).send('Internal Server Error');
    }
    //console.log(result.rows);
    res.setHeader('Content-Type', 'application/json');
    res.json(result.rows);
  });
});

module.exports = router;