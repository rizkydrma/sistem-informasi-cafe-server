const Category = require('./model');
const { policyFor } = require('../policy');

async function index(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Category')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }
  try {
    let { limit, skip } = req.query;

    let count = await Category.find().countDocuments();

    let categories = await Category.find()
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    return res.json({ data: categories, count });
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    let policy = policyFor(req.user);

    if (!policy.can('create', 'Category')) {
      return res.json({
        error: 1,
        message: `Anda tidak memiliki akses untuk membuat kategori`,
      });
    }

    let payload = req.body;
    let category = new Category(payload);

    await category.save();
    return res.json(category);
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
  try {
    let policy = policyFor(req.user);

    if (!policy.can('update', 'Category')) {
      return res.json({
        error: 1,
        message: `Anda tidak memiliki akses untuk mengubah kategori`,
      });
    }

    let payload = req.body;

    let category = await Category.findOneAndUpdate(
      { _id: req.params.id },
      payload,
      { new: true, runValidators: true },
    );

    return res.json(category);
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
  try {
    let policy = policyFor(req.user);

    if (!policy.can('delete', 'Category')) {
      return res.json({
        error: 1,
        message: `Anda tidak memiliki akses untuk menghapus kategori`,
      });
    }

    let deleted = await Category.findOneAndDelete({ _id: req.params.id });
    return res.json(deleted);
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'Category')) {
    return res.json({
      error: 1,
      message: `Anda tidak memiliki akses untuk menghapus kategori`,
    });
  }
  try {
    let { id } = req.params;

    let category = await Category.findOne({ _id: id });

    return res.json(category);
  } catch (err) {
    return res.json({
      error: 1,
      message: 'Error when getting category',
    });
  }
}

module.exports = {
  index,
  store,
  update,
  destroy,
  show,
};
