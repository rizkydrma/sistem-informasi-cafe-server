const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const tableSchema = Schema({
  notable: {
    type: Number,
    required: true,
  },
});

module.exports = model('Table', tableSchema);
