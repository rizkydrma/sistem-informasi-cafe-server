const Invoice = require('../invoice/model');
const OrderItem = require('../order-item/model');
const User = require('../user/model');
const { policyFor } = require('../policy');

const lsq = require('least-squares');

async function getAnalytics(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `You're not allowed to perform this action`,
    });
  }

  try {
    const date = new Date();

    date.setMonth(date.getMonth() + 1);

    let sumOrdersChart = await Invoice.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalAmount: { $sum: '$total' },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    let x = [];
    let y = [];
    let ret = {};

    sumOrdersChart.forEach((item, idx) => {
      x.push(idx + 1);
      y.push(item.totalAmount);
    });

    let generate = lsq(x, y, ret);

    sumOrdersChart.push({
      _id: date.toISOString().slice(0, 7),
      totalAmount: generate(x.length + 1),
    });

    res.json(sumOrdersChart.slice(0, 7));
  } catch (err) {
    next(err);
  }
}

async function getAnalyticsProduct(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `You're not allowed to perform this action`,
    });
  }
  try {
    let { startDate, endDate } = req.query;
    let orderItems = await OrderItem.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lt: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: '$name',
          qty: { $sum: '$qty' },
        },
      },
    ]).sort('-qty');

    res.json(orderItems.slice(0, 7));
  } catch (err) {
    next(err);
  }
}

async function getAnalyticsOneProduct(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Order')) {
    return res.json({
      error: 1,
      message: `You're not allowed to perform this action`,
    });
  }

  try {
    let { name } = req.query;

    const date = new Date();

    date.setMonth(date.getMonth() + 1);

    let orderItems = await OrderItem.aggregate([
      {
        $match: { name: name },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          qty: { $sum: '$qty' },
        },
      },
    ]).sort('_id');

    let x = [];
    let y = [];
    let ret = {};

    orderItems.forEach((item, idx) => {
      x.push(idx + 1);
      y.push(item.qty);
    });

    let generate = lsq(x, y, ret);

    let newQty;
    generate(x.length + 1) < 0
      ? (newQty = 0)
      : (newQty = generate(x.length + 1));
    orderItems.push({
      _id: date.toISOString().slice(0, 7),
      qty: newQty,
    });

    res.json(orderItems.slice(0, 7));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnalytics,
  getAnalyticsProduct,
  getAnalyticsOneProduct,
};
