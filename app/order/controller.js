const mongoose = require('mongoose');
const Order = require('./model');
const OrderItem = require('../order-item/model');
const CartItem = require('../cart-item/model');
const { policyFor } = require('../policy');
const { subject } = require('@casl/ability');

async function index(req, res, next) {
  // let policy = policyFor(req.user);

  // if (!policy.can('view', 'Order')) {
  //   return res.json({
  //     error: 1,
  //     message: `Youre not allowed to perform this action`,
  //   });
  // }

  try {
    let count = await Order.find({ user: req.user._id }).countDocuments();

    let orders = await Order.find({ user: req.user._id })
      .populate('order_items')
      .sort('-createdAt');

    return res.json({
      data: orders.map((order) => order.toJSON({ virtuals: true })),
      count,
    });
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

async function show(req, res, next) {
  try {
    let { order_id } = req.params;

    let order = await Order.findOne({ _id: order_id })
      .populate('order_items')
      .populate('user');

    let policy = policyFor(req.user);
    let subjectOrder = subject('Order', {
      ...order,
      user_id: order.user._id,
    });

    if (!policy.can('read', subjectOrder)) {
      return res.json({
        error: 1,
        message: 'Anda tidak memiliki akses untuk melihat invoice ini',
      });
    }

    return res.json(order);
  } catch (err) {
    return res.json({
      error: 1,
      message: 'Error when getting order',
    });
  }
}

async function store(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('create', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    let payload = req.body;
    let items = await CartItem.find({ user: req.user._id }).populate('product');

    if (!items.length) {
      return res.json({
        error: 1,
        message: 'Can not create order because you have no items in cart',
      });
    }

    let order = new Order({
      _id: new mongoose.Types.ObjectId(),
      status: 'waiting_payment',
      notable: payload.notable,
      user: req.user._id,
    });

    let orderItems = await OrderItem.insertMany(
      items.map((item) => ({
        ...item,
        name: item.product.name,
        qty: parseInt(item.qty),
        price: parseInt(item.product.price),
        order: order._id,
        product: item.product._id,
      })),
    );

    orderItems.forEach((item) => order.order_items.push(item));

    await order.save();

    // clear cart items
    await CartItem.deleteMany({ user: req.user._id });

    return res.json(order);
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

async function getAllData(req, res, next) {
  try {
    let { limit, skip } = req.query;

    let count = await Order.find().countDocuments();

    let orders = await Order.find()
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('order_items')
      .populate('user');
    return res.json({ data: orders, count });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  store,
  index,
  show,
  getAllData,
};
