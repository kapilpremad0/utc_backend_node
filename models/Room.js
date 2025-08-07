const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    boot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boot' },
    boot_amount: Number,
    max_blind: Number,
    max_chaal: Number,
    max_pot_amount: Number,
    min_buy_in: Number,
    max_buy_in: Number,
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    max_players: { type: Number, default: 5 },
    status: { type: String, enum: ['waiting', 'running', 'finished'], default: 'waiting' },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
