var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const connectFlash = require('connect-flash');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var watchlistRouter = require('./routes/watchlist');
var loginRouter = require('./routes/login');
const {log} = require("debug");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: "secret_passcode",
  cookie: {
    maxAge: 4000000
  },
  resave: false,
  saveUninitialized: false
}))
app.use(connectFlash());

app.use('/login', loginRouter);

app.use((req, res, next) => {
  // Provera autorizacije
  if (!req.session.korisnikID) {
    // Ako korisnik nije autorizovan, preusmeravanje na stranicu za login
    return res.redirect('/login');
  }

  // Ako je korisnik autorizovan, prosleđivanje zahteva dalje
  next();
});
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/watchlist', watchlistRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
