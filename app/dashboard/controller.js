const mongoose = require('mongoose');
const Order = require('../order/model');
const OrderItem = require('../order-item/model');
const { policyFor } = require('../policy');
const { subject } = require('@casl/ability');

async function getDataDashboard(req, res, next) {
  // let policy = policyFor(req.user);

  // if (!policy.can('view', 'Order')) {
  //   return res.json({
  //     error: 1,
  //     message: `You're not allowed to perform this action`,
  //   });
  // }

  try {
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

    let orderItems = await OrderItem.aggregate([
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

    return res.json({
      latestOrders: latestOrders
        .map((order) => order.toJSON({ virtuals: true }))
        .sort((a, b) => b.order_number - a.order_number)
        .slice(0, 5),
      topProducts: orderItems.slice(0, 9),
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

module.exports = {
  getDataDashboard,
};
