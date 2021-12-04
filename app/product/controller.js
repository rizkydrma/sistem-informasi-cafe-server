const Product = require('./model');
const Category = require('../category/model');
const Tag = require('../tag/model');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { policyFor } = require('../policy');

async function index(req, res, next) {
  try {
    let { limit, skip, q = '', category = '', tags = [] } = req.query;

    let criteria = {};

    if (q.length) {
      criteria = {
        ...criteria,
        name: { $regex: `${q}`, $options: 'i' },
      };
    }

    if (category.length) {
      category = await Category.findOne({
        name: { $regex: `${category}`, $options: 'i' },
      });

      if (category) {
        criteria = { ...criteria, category: category._id };
      }
    }

    let count = await Product.find(criteria).countDocuments();

    let products = await Product.find(criteria)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('category')
      .select('-__v');
    return res.json({ data: products, count });
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    let { product_id } = req.params;

    let product = await Product.findOne({ _id: product_id }).populate(
      'category',
    );
    return res.json(product);
  } catch (err) {
    return res.json({
      error: 1,
      message: 'Error when getting Product',
    });
  }
}

async function store(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('create', 'Product')) {
    return res.json({
      error: 1,
      message: 'Anda tidak memiliki akses untuk membuat produk',
    });
  }
  try {
    let payload = req.body;

    if (payload.category) {
      let category = await Category.findOne({
        name: { $regex: payload.category, $options: 'i' },
      });

      if (category) {
        payload = { ...payload, category: category._id };
      } else {
        delete payload.category;
      }
    }

    if (payload.tags && payload.tags.length) {
      let tags = await Tag.find({ name: { $in: payload.tags } });

      if (tags.length) {
        payload = { ...payload, tags: tags.map((tag) => tag._id) };
      }
    }

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt =
        req.file.originalname.split('.')[
          req.file.originalname.split('.').length - 1
        ];
      let filename = req.file.filename + '.' + originalExt;
      let target_path = path.resolve(
        config.rootPath,
        `public/upload/${filename}`,
      );
      const src = fs.createReadStream(tmp_path);
      const dest = fs.createWriteStream(target_path);
      src.pipe(dest);
      src.on('end', async () => {
        let product = new Product({ ...payload, image_url: filename });
        await product.save();
        return res.json(product);
      });
      src.on('error', async () => {
        next(err);
      });
    } else {
      let product = new Product(payload);
      await product.save();
      return res.json(product);
    }
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

async function update(req, res, next) {
  try {
    let policy = policyFor(req.user);

    if (!policy.can('update', 'Product')) {
      return res.json({
        error: 1,
        message: 'Anda tidak memiliki akses untuk mengupdate produk',
      });
    }

    let payload = req.body;

    if (payload.category) {
      let category = await Category.findOne({
        name: {
          $regex: payload.category,
          $options: 'i',
        },
      });

      if (category) {
        payload = { ...payload, category: category._id };
      } else {
        delete payload.category;
      }
    }

    if (payload.tags && payload.tags.length) {
      let tags = await Tag.find({ name: { $in: payload.tags } });

      if (tags.length) {
        payload = { ...payload, tags: tags.map((tag) => tag.id) };
      }
    }

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt =
        req.file.originalname.split('.')[
          req.file.originalname.split('.').length - 1
        ];
      let filename = req.file.filename + '.' + originalExt;
      let target_path = path.resolve(
        config.rootPath,
        `public/upload/${filename}`,
      );
      const src = fs.createReadStream(tmp_path);
      const dest = fs.createWriteStream(target_path);
      src.pipe(dest);
      src.on('end', async () => {
        // (1) cari produk yang akan diupdate
        let product = await Product.findOne({ _id: req.params.id });
        // (2) dapatkan absolut path ke gambar dari produk yang akandiupdate;
        let currentImage = `${config.rootPath}/public/upload/${product.image_url}`;
        // (3) cek apakah absolute path memang ada di file system
        if (fs.existsSync(currentImage)) {
          // (4) jika ada hapus dari file system
          fs.unlinkSync(currentImage);
        }
        // (5) update produk ke MongoDB
        product = await Product.findOneAndUpdate(
          { _id: req.params.id },
          { ...payload, image_url: filename },
          { new: true, runValidators: true },
        );
        req.io.sockets.emit(`stockProduct-${product._id}`, {
          stock: product.stock,
        });

        req.io.sockets.emit('stockProduct', {
          _id: product._id,
          stock: product.stock,
        });
        return res.json(product);
      });
      src.on('error', async () => {
        next(err);
      });
    } else {
      // (6) update produk jika tidak ada file upload
      let product = await Product.findOneAndUpdate(
        { _id: req.params.id },
        payload,
        { new: true, runValidators: true },
      );
      req.io.sockets.emit(`stockProduct-${product._id}`, {
        stock: product.stock,
      });

      req.io.sockets.emit('stockProduct', {
        _id: product._id,
        stock: product.stock,
      });
      return res.json(product);
    }
  } catch (err) {
    // ----- cek tipe error ---- //
    if (err && err.name === 'ValidationError') {
      return res.json({ error: 1, message: err.message, fields: err.errors });
    }

    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    let policy = policyFor(req.user);

    if (!policy.can('delete', 'Product')) {
      return res.json({
        error: 1,
        message: 'Anda tidak memiliki akses untuk menghapus produk',
      });
    }

    let product = await Product.findOneAndDelete({ _id: req.params.id });
    let currentImage = `${config.rootPath}/public/upload/${product.image_url}`;

    if (fs.existsSync(currentImage)) {
      fs.unlinkSync(currentImage);
    }
    return res.json(product);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  index,
  store,
  update,
  destroy,
  show,
};
