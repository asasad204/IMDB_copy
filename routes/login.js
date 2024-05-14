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

const getHashedPassword = async (plainPassword) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(saltRounds, function (err, salt) {
      if (err) {
        reject(err)
      } else {
        bcrypt.hash(plainPassword, salt, function (err, hash) {
          if (err)
            reject(err)
          else
            resolve(hash)
        });
      }

    });
  })
}



router.get('/', async function(req, res, next) {
  console.log(req.session);
  console.log(req.session.korisnikId);
  const flashMessages=req.flash('error')[0];
  res.render('login', {flashMessages});
});

/* GET home page. */
router.get('/register', function(req, res, next) {
  const flashMessages=req.flash('error')[0];
  res.render('register', {flashMessages});
});

router.post('/register', async function(req, res, next) {
  const {email, username, password} = req.body;
  console.log(req.body);
  const passwordhashed = await getHashedPassword(password);
  console.log(passwordhashed);
  await pool.connect((err,client, done)=> {
    if (err)
      return res.status(500).json({error: 'greska prilikom konektovanja na bazu ' + err});
    client.query('select username, email from korisnik where email=$1 or username=$2', [email, username], (err, result) => {
      if (err){
        done();
        return res.status(500).json({error: 'greska ' + err});
      }
      console.log(result.rows.length);
      console.log(result.rows);
      if(result.rows.length > 0){
        req.flash('error', 'User already exists. Please try again.');
        return  res.redirect('/login/register');
      }
      client.query('insert into korisnik(email, username, password) values($1,$2,$3)', [email, username, passwordhashed], (err, result) => {
        done();
        if (err)
          return res.status(500).json({error: 'greska prilikom unosa podataka ' + err});
        res.redirect('/login');
      })
    })
  })

});
router.post('/login_validacija', async function(req, res, next) {

  const plainPassword = req.body.password
  const hashedPassword = await getHashedPassword(plainPassword)

  const userFromReq = {
    username: req.body.username,
    password: req.body.password,
  }

  pool.connect((err, client, done) => {
    if (err) {
      return res.send(err)
    }

    client.query(`SELECT * FROM korisnik WHERE username=$1;`, [userFromReq.username], (err, result) => {
      done();
      if (err) {
        return res.send(err)
      }
      if(result.rows.length < 1){
        req.flash('error', 'User doesnt exist. Try again!');
        return  res.redirect('/login');
      }
      const korisnik = {
        id : result.rows[0].id,
        uloga : result.rows[0].uloga,
        username: result.rows[0].username
      }
      bcrypt.compare(userFromReq.password, result.rows[0].password, function (err, resultCompare) {
        if (resultCompare) {
          const userData = result.rows[0];
          req.session.korisnikID = korisnik.id;
          req.session.uloga = korisnik.uloga;
          req.session.username = korisnik.username;
          console.log(req.session);
          return res.redirect('/filmovi');
        } else{
          req.flash('error', 'Incorrect username or password. Try again!');
          return res.redirect('/login');
        }

      });
    })

  })
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

router.get('/admin', (req, res) => {

});

router.post('/admin', (req, res) => {
  const { naziv, rating, opis, url_postera, datum_release } = req.body;

  // Validate required fields
  if (!naziv || !rating || !opis || !url_postera || !datum_release) {
    return res.status(400).send('All fields are required.');
  }

  const queryText = `INSERT INTO filmovi (naziv, rating, opis, url_postera, datum_release) VALUES ($1, $2, $3, $4, $5);`;

  pool.query(queryText, [naziv, rating, opis, url_postera, datum_release], (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/login/admin');
  });
});

module.exports = router;