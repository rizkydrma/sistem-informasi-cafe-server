const router = require('express').Router();
const controller = require('./controller');
const multer = require('multer');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.use(
  new LocalStrategy({ usernameField: 'email' }, controller.localStrategy),
);

router.post('/guestlogin', multer().none(), controller.guestlogin);
router.post('/register', multer().none(), controller.register);
router.post('/login', multer().none(), controller.login);
router.get('/me', controller.me);
router.post('/logout', controller.logout);

module.exports = router;
