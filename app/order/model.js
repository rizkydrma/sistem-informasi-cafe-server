const mongoose = require('mongoose');
const { model, Schema } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const Invoice = require('../invoice/model');

const orderSchema = Schema(
  {
    status_payment: {
      type: String,
      enum: ['waiting_payment', 'done'],
      default: 'waiting_payment',
    },
    status_order: {
      type: String,
      enum: ['preparing', 'delivery', 'delivered'],
      default: 'preparing',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notable: {
      type: Number,
      required: [true, 'Notable harus diisi'],
    },
    order_items: [
      {
        type: Schema.Types.ObjectId,
        ref: 'OrderItem',
      },
    ],
  },
  { timestamps: true },
);

orderSchema.plugin(AutoIncrement, { inc_field: 'order_number' });

orderSchema.virtual('items_count').get(function () {
  return this.order_items.reduce((total, item) => {
    return total + parseInt(item.qty);
  }, 0);
});

orderSchema.post('save', async function () {
  let sub_total = this.order_items.reduce(
    (sum, item) => (sum += item.price * item.qty),
    0,
  );

  let invoice = new Invoice({
    user: this.user,
    order: this._id,
    sub_total: sub_total,
    total: sub_total + sub_total * 0.1,
  });

  await invoice.save();
});

module.exports = model('Order', orderSchema);
