// models/Boot.js

const mongoose = require('mongoose');

const bootSchema = new mongoose.Schema({
  boot_amount: {
    type: Number,
    required: true,
  },
  max_blind: {
    type: Number,
    required: true,
  },
  max_chaal: {
    type: Number,
    required: true,
  },
  max_pot_amount: {
    type: Number,
    required: true,
  },
  min_buy_in: {
    type: Number,
    default: 0,
  },
  max_buy_in: {
    type: Number,
    default: 0,
  },
  status: {
    type: Boolean,
    default: true, // active
  },
}, {
  timestamps: true // adds createdAt and updatedAt
});

module.exports = mongoose.model('Boot', bootSchema);
