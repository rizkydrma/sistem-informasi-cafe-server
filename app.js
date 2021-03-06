var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');
var socketio = require('socket.io');
const cors = require('cors');

const productRouter = require('./app/product/router');
const categoryRouter = require('./app/category/router');
const tagRouter = require('./app/tag/router');
const authRouter = require('./app/auth/router');
const cartRouter = require('./app/cart/router');
const orderRouter = require('./app/order/router');
const invoiceRouter = require('./app/invoice/router');
const tableRouter = require('./app/table/router');
const likedRouter = require('./app/liked/router');
const userRouter = require('./app/user/router');
const analyticsRouter = require('./app/analytics/router');

// SERVER
const dashboardController = require('./app/dashboard/router');

const { decodeToken } = require('./app/auth/middleware');

var app = express();
const server = require('http').createServer(app);
const io = socketio(server, {
  pingTimeout: 30000,
  transports: ['websocket'],
  allowUpgrades: false,
});

io.on('connection', function (socket) {
  socket.on('disconnect', (reason) => {
    console.log(`disconnect reason: ${reason}`);
  });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(function (req, res, next) {
  req.io = io;
  next();
});
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(decodeToken());

app.use('/auth', authRouter);

app.use('/api', productRouter);
app.use('/api', categoryRouter);
app.use('/api', tagRouter);
app.use('/api', cartRouter);
app.use('/api', orderRouter);
app.use('/api', invoiceRouter);
app.use('/api', tableRouter);
app.use('/api', likedRouter);
app.use('/api', userRouter);

// SERVER
app.use('/api', dashboardController);
app.use('/api', analyticsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = { app: app, server: server, io };
