// models/LootTransaction.js
const mongoose = require('mongoose');

const lootTransactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LootTransaction', lootTransactionSchema);
