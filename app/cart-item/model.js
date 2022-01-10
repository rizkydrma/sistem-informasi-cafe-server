const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const cartItemSchema = Schema({
  name: {
    type: String,
    minlength: [5, 'Panjang nama makanan minimal 50 karakter'],
    required: [true, 'Nama harus diisi'],
  },
  qty: {
    type: Number,
    required: [true, 'qty harus diisi'],
    min: [1, 'minimal qty adalah 1'],
  },
  price: {
    type: Number,
    default: 0,
  },
  image_url: String,
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  variant: {
    type: String,
  },
});

module.exports = model('CartItem', cartItemSchema);
