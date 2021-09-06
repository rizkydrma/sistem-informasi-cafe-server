const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const tableSchema = Schema(
  {
    notable: {
      type: Number,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: '',
    },
  },
  { timestamps: true },
);

module.exports = model('Table', tableSchema);
