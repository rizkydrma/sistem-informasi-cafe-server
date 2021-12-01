const User = require('./model');
const { policyFor } = require('../policy');
const path = require('path');
const fs = require('fs');
const config = require('../config');

async function index(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('view', 'User')) {
    return res.json({
      error: 1,
      message: `Youre not allowed to perform this action`,
    });
  }

  try {
    let { limit, skip } = req.query;

    let count = await User.find().countDocuments();

    let users = await User.find().limit(parseInt(limit)).skip(parseInt(skip));

    return res.json({ data: users, count });
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  let policy = policyFor(req.user);

  if (!policy.can('create', 'User')) {
    return res.json({
      error: 1,
      message: `Anda tidak memiliki akses untuk membuat kategori`,
    });
  }
  try {
    let payload = req.body;
    console.log(req.file);
    console.log(payload);
    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt =
        req.file.originalname.split('.')[
          req.file.originalname.split('.').length - 1
        ];
      let filename = req.file.filename + '.' + originalExt;
      let target_path = path.resolve(
        config.rootPath,
        `public/upload/user/${filename}`,
      );
      const src = fs.createReadStream(tmp_path);
      const dest = fs.createWriteStream(target_path);
      src.pipe(dest);
      src.on('end', async () => {
        console.log({ ...payload, image_url: filename });
        let user = new User({ ...payload, image_url: filename });

        await user.save();
        return res.json(user);
      });
      src.on('error', async () => {
        next(err);
      });
    } else {
      let user = new User({ ...payload, image_url: 'user.jpg' });
      await user.save();
      return res.json(user);
    }
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

  if (!policy.can('update', 'User')) {
    return res.json({
      error: 1,
      message: `Anda tidak memiliki akses untuk mengubah kategori`,
    });
  }

  try {
    let payload = req.body;

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt =
        req.file.originalname.split('.')[
          req.file.originalname.split('.').length - 1
        ];
      let filename = req.file.filename + '.' + originalExt;
      let target_path = path.resolve(
        config.rootPath,
        `public/upload/user/${filename}`,
      );
      const src = fs.createReadStream(tmp_path);
      const dest = fs.createWriteStream(target_path);
      src.pipe(dest);
      src.on('end', async () => {
        // (1) cari produk yang akan diupdate
        let user = await User.findOne({ _id: req.params.id });
        // (2) dapatkan absolut path ke gambar dari produk yang akandiupdate;
        let currentImage = `${config.rootPath}/public/upload/user/${user.image_url}`;
        // (3) cek apakah absolute path memang ada di file system
        if (fs.existsSync(currentImage)) {
          // (4) jika ada hapus dari file system
          fs.unlinkSync(currentImage);
        }
        // (5) update produk ke MongoDB
        user = await User.findOneAndUpdate(
          { _id: req.params.id },
          { ...payload, image_url: filename },
          { new: true, runValidators: true },
        );
        return res.json(user);
      });
      src.on('error', async () => {
        next(err);
      });
    } else {
      // (6) update produk jika tidak ada file upload
      let user = await User.findOneAndUpdate({ _id: req.params.id }, payload, {
        new: true,
        runValidators: true,
      });
      return res.json(user);
    }
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

  if (!policy.can('delete', 'User')) {
    return res.json({
      error: 1,
      message: `Anda tidak memiliki akses untuk menghapus kategori`,
    });
  }
  try {
    let user = await User.findOneAndDelete({ _id: req.params.id });

    if (user.image_url !== 'user.jpg') {
      let currentImage = `${config.rootPath}/public/upload/user/${user.image_url}`;

      if (fs.existsSync(currentImage)) {
        fs.unlinkSync(currentImage);
      }
    }

    return res.json(user);
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

    let user = await User.findOne({ _id: id });

    return res.json(user);
  } catch (err) {
    return res.json({
      error: 1,
      message: 'Error when getting user',
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
