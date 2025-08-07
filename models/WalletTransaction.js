const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  reason: {
    type: String, // e.g., 'bet', 'win', 'deposit', 'withdraw', 'refund'
    required: true
  },
  description: {
    type: String
  },
  balance_after: {
    type: Number, // User's balance after transaction
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
