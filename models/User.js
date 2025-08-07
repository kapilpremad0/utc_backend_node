const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    player_id: {
        type: String,
        required: true,
        unique: true
    },
    user_name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String, // This will store the image URL or path
        default: ''   // Optional: provide a default avatar
    },
    is_guest: {
        type: Boolean,
        default: false
    },
    wallet_balance: {
        type: Number,
        default: 0  // Or starting balance
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
