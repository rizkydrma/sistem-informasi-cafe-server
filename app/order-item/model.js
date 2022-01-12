const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const orderItemSchema = Schema(
  {
    name: {
      type: String,
      minglength: [5, 'Panjang nama makanan minimal 50 karakter'],
      required: [true, 'Nama harus diisi'],
    },
    price: {
      type: Number,
      required: [true, 'Harga harus diisi'],
    },
    qty: {
      type: Number,
      required: [true, 'Kuantitas harus diisi'],
      min: [1, 'Kuantitas minimal 1'],
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    variant: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = model('OrderItem', orderItemSchema);
