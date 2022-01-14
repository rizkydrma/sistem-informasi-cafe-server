const User = require('../user/model');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const { getToken } = require('../utils/get-token');

async function register(req, res, next) {
  try {
    let payload = req.body;

    let user = new User({ ...payload, image_url: 'user.jpg' });

    req.io.sockets.emit('thisNewCustomer', 'update data');

    await user.save();
    return res.json(user);
  } catch (err) {
    if (err && err.name === 'ValidationError') {
      return res.json({
        error: 1,
        message: err.message,
        fields: err.errors,
      });
    }
    next(err);
  }
}

async function localStrategy(email, password, done) {
  try {
    let user = await User.findOne({ email }).select(
      '-__v -createdAt -updatedAt -cart_items -token',
    );

    if (!user) return done();

    if (bcrypt.compareSync(password, user.password)) {
      ({ password, ...userWithoutPassword } = user.toJSON());
      return done(null, userWithoutPassword);
    }
  } catch (err) {
    done(err, null);
  }
  done();
}

async function login(req, res, next) {
  passport.authenticate('local', async function (err, user) {
    if (err) return next(err);

    if (!user)
      return res.json({ error: 1, message: 'email or password incorrect' });

    let signed = jwt.sign(user, config.secretKey);
    await User.findOneAndUpdate(
      { _id: user._id },
      { $push: { token: signed }, $set: { active: 'active' } },
      { new: true },
    );
    let customerCount = await User.find({
      active: 'active',
      role: 'guest',
    }).countDocuments();
    req.io.sockets.emit(`customerCount`, { customerCount: customerCount });

    return res.json({
      message: 'logged in successfully',
      user: user,
      token: signed,
    });
  })(req, res, next);
}

async function adminlogin(req, res, next) {
  passport.authenticate('local', async function (err, user) {
    if (err) return next(err);

    if (!user)
      return res.json({ error: 1, message: 'email or password incorrect' });

    if (!user.role === 'guest')
      return res.json({ error: 1, message: 'You not have access to login' });

    let signed = jwt.sign(user, config.secretKey);
    await User.findOneAndUpdate(
      { _id: user._id },
      { $push: { token: signed } },
      { new: true },
    );

    return res.json({
      message: 'logged in successfully',
      user: user,
      token: signed,
    });
  })(req, res, next);
}

async function me(req, res, next) {
  if (!req.user) {
    return res.json({
      error: 1,
      message: `Your're not login or token`,
    });
  }

  return res.json(req.user);
}

async function logout(req, res, next) {
  let token = getToken(req);

  let user = await User.findOneAndUpdate(
    { token: { $in: [token] } },
    { $pull: { token }, $set: { active: 'deactive' } },
    { useFindAndModify: false },
  );

  if (!user || !token) {
    return res.json({
      error: 1,
      message: 'No user found',
    });
  }

  let customerCount = await User.find({
    active: 'active',
    role: 'guest',
  }).countDocuments();
  req.io.sockets.emit(`customerCount`, { customerCount: customerCount });

  return res.json({
    error: 0,
    message: 'Logout berhasil',
  });
}

module.exports = {
  register,
  localStrategy,
  login,
  me,
  logout,
  adminlogin,
};
