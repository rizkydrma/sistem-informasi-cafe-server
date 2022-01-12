const Invoice = require('../invoice/model');
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

    res.json(sumOrdersChart);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnalytics,
};
