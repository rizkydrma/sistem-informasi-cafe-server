const Table = require('./model');
const User = require('../user/model');
const { policyFor } = require('../policy');

async function index(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Table')) {
    return res.json({
      error: 1,
      message: 'Youre not allowed to perform this action',
    });
  }

  try {
    let tables = await Table.find().select('-__v');
    return res.json(tables);
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Table')) {
    return res.json({
      error: 1,
      message: 'Youre not allowed to perform this action',
    });
  }

  try {
    let payload = req.body;
    let table = new Table(payload);

    await table.save();
    return res.json(table);
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

async function update(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('update', 'Table')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    let payload = req.body;

    let table = await Table.findOneAndUpdate(
      { _id: req.params.id },
      {
        $set: {
          user: payload.user,
        },
      },
      { new: true },
    );

    return res.json(table);
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

  if (!policy.can('delete', 'Table')) {
    return res.josn({
      error: 1,
      message: 'Youre not allowed to perform this action',
    });
  }

  try {
    let deleted = await Table.findOneAndDelete({ _id: req.params.id });
    return res.json(deleted);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  store,
  update,
  destroy,
  index,
};
