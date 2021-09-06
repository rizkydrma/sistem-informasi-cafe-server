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

    variant: {
      type: String,
      minlength: [3, 'Panjang nama produk minimal 3 karakter'],
      maxlength: [255, 'Panjang nama produk maksimal 255 karakter'],
    },

    description: {
      type: String,
      maxlength: [700, 'Panjang deskripsi produk maksimal 255 karakter'],
    },

    price: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 4.5,
    },

    type: {
      type: String,
      minlength: [3, 'Panjang nama produk minimal 3 karakter'],
    },

    image_url: String,

    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },

    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
  },
  { timestamps: true },
);

module.exports = model('Product', productSchema);
