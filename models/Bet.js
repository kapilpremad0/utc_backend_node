const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {  // 'blind', 'chaal', 'pack', 'side_show', etc.
    type: String,
    enum: ['blind', 'chaal', 'pack', 'side_show'],
    required: true
  },
  is_blind: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bet', betSchema);
