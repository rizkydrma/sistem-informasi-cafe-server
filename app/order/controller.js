const mongoose = require('mongoose');
const Order = require('./model');
const User = require('../user/model');
const Invoice = require('../invoice/model');
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
    let { limit, skip } = req.query;
    let count = await Order.find({ user: req.user._id }).countDocuments();

    let orders = await Order.find({ user: req.user._id })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
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
  // let policy = policyFor(req.user);

  // if (!policy.can('create', 'Order')) {
  //   return res.json({
  //     error: 1,
  //     message: `Youre not allowed to perform this action`,
  //   });
  // }

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
        variant: item.variant,
      })),
    );

    orderItems.forEach((item) => order.order_items.push(item));

    await order.save();

    // clear cart items
    await CartItem.deleteMany({ user: req.user._id });

    // SOCKET

    let lastAddOrder = await Order.find()
      .populate('order_items')
      .populate('user')
      .sort({ createdAt: -1 });

    req.io.sockets.emit('thisNewOrder', {
      data: lastAddOrder[0],
    });

    let user = await User.findOne({ _id: req.user._id });

    req.io.sockets.emit(`notifNewOrder`, {
      type: 'preparing',
      user: user.full_name,
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
    let { limit, skip, startDate, endDate } = req.query;

    if (startDate === undefined || endDate === undefined) {
      let count = await Order.find().countDocuments();

      let orders = await Order.find()
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('order_items')
        .populate('user')
        .sort('-createdAt');
      return res.json({ data: orders, count });
    } else {
      let count = await Order.find({
        createdAt: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        },
      }).countDocuments();

      let orders = await Order.find({
        createdAt: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
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

async function generateReport(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }
  try {
    let { startDate, endDate } = req.query;

    let orders = await Order.find({
      createdAt: {
        $gte: new Date(startDate),
        $lt: new Date(endDate),
      },
    }).select('_id');

    let newOrders = [];
    orders.forEach((item) => {
      newOrders.push(item._id.toString());
    });

    let orderItems = await OrderItem.find()
      .populate('order')
      .select('-__v -product -_id');

    let result = orderItems.filter((item) =>
      newOrders.includes(item.order._id.toString()),
    );

    return res.json({ data: result, count: result.length });
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

    let oldOrder = await Order.findOne({ _id: req.params.id });

    let order = await Order.findOneAndUpdate({ _id: req.params.id }, payload, {
      new: true,
      runValidators: true,
    })
      .populate('order_items')
      .populate('user');

    if (oldOrder.status_payment !== order.status_payment) {
      req.io.sockets.emit(`statusPayment-${order.user._id}`, {
        data: order.status_payment,
        orderNo: order.order_number,
      });
    } else {
      req.io.sockets.emit(`progressOrder-${order._id}`, { order: order });
      req.io.sockets.emit(`updateOrder-${order.user._id}`, {
        data: order.status_order,
        orderNo: order.order_number,
      });
      req.io.sockets.emit(`notifNewOrder`, {
        type: order.status_order,
        user: order.user.full_name,
      });
    }

    req.io.sockets.emit('updateOrder', 'updateOrder');

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
    let order = await Order.findOne({ _id: req.params.id }).populate(
      'order_items',
    );

    order.order_items.forEach(async (orderItem) => {
      await OrderItem.findOneAndDelete({ _id: orderItem.id });
    });

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

    if (validateEmail(id)) {
      let user = await User.findOne({ email: id });

      if (user === null) {
        return res.json({
          error: 1,
          message: 'User tidak ada',
        });
      }

      let order = await Order.find({ user: user._id })
        .populate('order_items')
        .populate('user');

      return res.json(order);
    } else {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        // Yes, it's a valid ObjectId, proceed with `findById` call.
        let order = await Order.find({ user: id })
          .populate('order_items')
          .populate('user');

        return res.json(order);
      }
      return res.json({
        error: 1,
        message: 'User tidak ada',
      });
    }
  } catch (err) {
    if (err) {
      return res.json({
        error: 1,
        message: err.message,
        fields: err.errors,
      });
    }
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

    if (validateEmail(id)) {
      let user = await User.findOne({ email: id });

      let orders = await Order.updateMany(
        { user: user._id },
        { $set: { status_payment: 'done' } },
      );

      await Invoice.updateMany(
        { user: user._id },
        { $set: { payment_status: 'done' } },
      );

      req.io.sockets.emit(`statusPayment-${id}`, { orders });
      return res.json(orders);
    } else {
      let orders = await Order.updateMany(
        { user: id },
        { $set: { status_payment: 'done' } },
      );

      await Invoice.updateMany(
        { user: id },
        { $set: { payment_status: 'done' } },
      );

      req.io.sockets.emit(`statusPayment-${id}`, { orders });
      return res.json(orders);
    }
  } catch (err) {
    next(err);
  }
}

function validateEmail(emailAdress) {
  let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (emailAdress.match(regexEmail)) {
    return true;
  } else {
    return false;
  }
}

module.exports = {
  store,
  index,
  show,
  getAllData,
  generateReport,
  update,
  destroy,
  getOrdersByID,
  updateStatusPaymentsByID,
};
