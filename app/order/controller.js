const mongoose = require('mongoose');
const Order = require('./model');
const OrderItem = require('../order-item/model');
const CartItem = require('../cart-item/model');
const { policyFor } = require('../policy');
const { subject } = require('@casl/ability');

async function index(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

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
    let { id } = req.params;

    let order = await Order.findOne({ _id: id })
      .populate('order_items')
      .populate('user');

    let policy = policyFor(req.user);
    // let subjectOrder = subject('Order', {
    //   ...order,
    //   user_id: order.user._id,
    // });

    if (!policy.can('read', 'Order')) {
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

    // SOCKET

    let date = new Date();
    let nowMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;

    let sumOrdersChart = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    let latestOrders = await Order.find()
      .populate('order_items')
      .populate('user');

    let totalSumOrders = latestOrders
      .map((order) => order.toJSON({ virtuals: true }))
      .filter((order) => order.createdAt.toISOString().slice(0, 7) == nowMonth)
      .map((order) => {
        return order.order_items.reduce(
          (acc, curr) => acc + curr.price * curr.qty,
          0,
        );
      })
      .reduce((acc, curr) => acc + curr);

    let grandTotal = totalSumOrders + totalSumOrders * 0.1;
    let totalOrders = latestOrders.length;

    let orderItemsSocket = await OrderItem.aggregate([
      {
        $group: {
          _id: '$name',
          qty: { $sum: '$qty' },
        },
      },
    ]).sort('-qty');

    let totalOrdersChart = latestOrders
      .map((order) => order.toJSON({ virtuals: true }))
      .filter((order) => order.createdAt.toISOString().slice(0, 7) == nowMonth)
      .map((order) => ({
        _id: order.createdAt.toISOString().slice(0, 10),
        totalAmount: order.order_items.reduce(
          (acc, curr) => acc + curr.price * curr.qty,
          0,
        ),
      }))
      .reduce((acc, curr) => {
        let item = acc.find((item) => item._id === curr._id);

        if (item) {
          item.totalAmount += curr.totalAmount;
        } else {
          acc.push(curr);
        }

        return acc;
      }, []);

    req.io.sockets.emit('newOrders', {
      latestOrders: latestOrders
        .map((order) => order.toJSON({ virtuals: true }))
        .sort((a, b) => b.order_number - a.order_number)
        .slice(0, 5),
      topProducts: orderItemsSocket.slice(0, 6),
      orders: {
        totalOrdersChart: totalOrdersChart.sort(
          (a, b) => a._id.slice(8, 10) - b._id.slice(8, 10),
        ),
        sumOrdersChart: sumOrdersChart.sort(
          (a, b) => a._id.slice(8, 10) - b._id.slice(8, 10),
        ),
      },
      grandTotal,
      totalOrders,
    });

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
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }
  try {
    let { limit, skip, date } = req.query;

    if (date === undefined) {
      let count = await Order.find().countDocuments();

      let orders = await Order.find()
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('order_items')
        .populate('user')
        .sort('-createdAt');
      return res.json({ data: orders, count });
    } else {
      let splitDate = date.split('-');
      let startDate, endDate;

      if (splitDate[2] === undefined) {
        startDate = new Date(splitDate[0], +splitDate[1] - 1, 1);
        endDate = new Date(splitDate[0], +splitDate[1], 1);
      } else {
        startDate = new Date(splitDate[0], +splitDate[1] - 1, splitDate[2]);
        endDate = new Date(splitDate[0], +splitDate[1] - 1, +splitDate[2] + 1);
      }

      let count = await Order.find({
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      }).countDocuments();

      let orders = await Order.find({
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('order_items')
        .populate('user')
        .sort('-createdAt');

      return res.json({ data: orders, count });
    }
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('update', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }
  try {
    let payload = req.body;
    let { id } = req.params;

    let order = await Order.findOneAndUpdate({ _id: req.params.id }, payload, {
      new: true,
      runValidators: true,
    })
      .populate('order_items')
      .populate('user');

    req.io.sockets.emit(`progressOrder-${order._id}`, { order: order });

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

async function destroy(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('update', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    let deleted = await Order.findOneAndDelete({ _id: req.params.id });
    return res.json(deleted);
  } catch (err) {
    next(err);
  }
}

async function getOrdersByID(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    const { id } = req.params;

    let order = await Order.find({ user: id })
      .populate('order_items')
      .populate('user');

    return res.json(order);
  } catch (err) {
    next(err);
  }
}

async function updateStatusPaymentsByID(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('update', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    const { id } = req.params;

    let orders = await Order.updateMany(
      { user: id },
      { $set: { status_payment: 'done' } },
    );

    return res.json(orders);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  store,
  index,
  show,
  getAllData,
  update,
  destroy,
  getOrdersByID,
  updateStatusPaymentsByID,
};
