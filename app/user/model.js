const mongoose = require('mongoose');
const { model, Schema } = mongoose;
const bcrypt = require('bcrypt');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const HASH_ROUND = 10;

let userSchema = Schema(
  {
    full_name: {
      type: String,
      required: [true, 'Nama harus diisi'],
      maxlength: [255, 'Panjang nama harus antara 3 - 255 karakter'],
      minlength: [3, 'Panjang nama harus antara 3 - 255 karakter'],
    },
    // customer_id: {
    //   type: Number,
    // },
    email: {
      type: String,
      required: [true, 'Email harus diisi'],
      maxlength: [255, 'Panjang email maksimal 255 karakter'],
    },
    image_url: String,
    password: {
      type: String,
      required: [true, 'Password harus diisi'],
      maxlength: [255, 'Panjang password maksimal 255 karakter'],
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'guest', 'kitchen', 'waiter', 'cashier'],
      default: 'guest',
    },
    token: [String],
    active: {
      type: String,
      enum: ['deactive', 'active', 'suspend'],
      default: 'deactive',
    },
  },
  { timestamps: true },
);

// Validasi Email
userSchema.path('email').validate(
  function (value) {
    const EMAIL_RE = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
    return EMAIL_RE.test(value);
  },
  (attr) => `${attr.value} harus merupakan email yang valid!`,
);

// VALIDASI EMAIL TERDAFTAR
userSchema.path('email').validate(function (value, respond) {
  return mongoose
    .model('User')
    .count({ email: value })
    .exec()
    .then(function (count) {
      return !count;
    })
    .catch(function (err) {
      throw err;
    });
}, 'Email sudah terdaftar');

// HASHING PASSWORD
userSchema.pre('save', function (next) {
  this.password = bcrypt.hashSync(this.password, HASH_ROUND);
  next();
});

// HASHING PASSWORD
userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.password) {
    this.getUpdate().password = bcrypt.hashSync(
      this.getUpdate().password,
      HASH_ROUND,
    );
    next();
  } else {
    next();
  }
});

// userSchema.plugin(AutoIncrement, { inc_field: 'customer_id' });

module.exports = model('User', userSchema);
