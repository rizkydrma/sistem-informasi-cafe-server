const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const likedItemSchema = Schema({
  name: {
    type: String,
    minlength: [5, 'Panjang nama makanan minimal 50 karakter'],
    required: [true, 'Nama harus diisi'],
  },
  variant: {
    type: String,
    minlength: [3, 'Panjang nama produk minimal 3 karakter'],
    maxlength: [255, 'Panjang nama produk maksimal 255 karakter'],
  },
  price: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 4.5,
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
});

module.exports = model('LikedItem', likedItemSchema);
