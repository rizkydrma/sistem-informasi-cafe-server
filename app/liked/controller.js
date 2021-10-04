const Product = require('../product/model');
const LikedItem = require('../liked-item/model');
const { policyFor } = require('../policy');

async function index(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('read', 'Liked')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    let items = await LikedItem.find({ user: req.user._id }).populate(
      'product',
    );
    return res.json(items);
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

  if (!policy.can('update', 'Liked')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    let { items } = req.body;
    const productIds = items.map((itm) => itm.product._id);
    const products = await Product.find({ _id: { $in: productIds } });
    let likedItems = items.map((item) => {
      let relatedProduct = products.find(
        (product) => product._id.toString() === item.product._id,
      );
      return {
        product: relatedProduct._id,
        price: relatedProduct.price,
        rating: relatedProduct.rating,
        image_url: relatedProduct.image_url,
        name: relatedProduct.name,
        user: req.user._id,
      };
    });
    await LikedItem.deleteMany({ user: req.user._id });
    await LikedItem.bulkWrite(
      likedItems.map((item) => {
        return {
          updateOne: {
            filter: { user: req.user._id, product: item.product },
            update: item,
            upsert: true,
          },
        };
      }),
    );
    return res.json(likedItems);
  } catch (err) {
    if (err && err.name === 'ValidationError') {
      return res.json({
        error: 1,
        message: err.message,
        fields: err.errors,
      });
    }
  }
}

module.exports = { index, update };
