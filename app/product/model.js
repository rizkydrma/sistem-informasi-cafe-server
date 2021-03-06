const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const productSchema = Schema(
  {
    name: {
      type: String,
      minlength: [3, 'Panjang nama produk minimal 3 karakter'],
      maxlength: [255, 'Panjang nama produk maksimal 255 karakter'],
      required: [true, 'Nama produk harus diisi'],
    },
    description: {
      type: String,
      maxlength: [700, 'Panjang deskripsi produk maksimal 255 karakter'],
    },

    price: {
      type: Number,
      default: 0,
    },

    liked: {
      type: Number,
      default: 0,
    },

    variant: {
      type: String,
    },

    type: {
      type: Boolean,
      default: false,
    },

    image_url: String,

    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    stock: {
      type: String,
      enum: ['in stock', 'out of stock'],
      default: 'in stock',
    },
  },
  { timestamps: true },
);

module.exports = model('Product', productSchema);
