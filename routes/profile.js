const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');


router.get('/', async (req, res) => {
    const userId = req.user.id; // assuming authentication middleware sets req.user

    try {
        const user = await User.findById(userId).select('-password'); // exclude password

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transactions = await WalletTransaction.find({ user_id: userId }).sort({ created_at: -1 });
        return res.json({
            user,
            wallet_transactions: transactions
        });
    } catch (err) {
        console.error('Get Profile Data:', err.message);
        return res.status(500).json({
            message: 'Server Error',
            success: false
        });
    }
});


router.put('/', async (req, res) => {
    const userId = req.user.id;
    const { user_name, avatar } = req.body || {};

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (user_name) user.user_name = user_name;
        if (avatar) user.avatar = avatar;

        await user.save();

        return res.json({
            message: 'Profile updated successfully',
            user: {
                user_name: user.user_name,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error('Update Profile:', err.message);
        return res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;