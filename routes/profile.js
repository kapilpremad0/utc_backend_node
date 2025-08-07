const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const LootTransaction = require('../models/LootTransaction');
const { logWalletTransaction } = require('../helpers/wallet');



router.get('/', async (req, res) => {
    const userId = req.user.id; // assuming authentication middleware sets req.user

    try {
        const user = await User.findById(userId).select('-password'); // exclude password

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transactions = await WalletTransaction.find({ user_id: userId }).sort({ created_at: -1 });
        const loot = await LootTransaction.find({ user_id: userId }).sort({ created_at: -1 });
        return res.json({
            user,
            wallet_transactions: transactions,
            loot: loot
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



router.post('/open-daily-loot', async (req, res) => {
    const userId = req.user.id;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get today’s loot transactions
    const todayLoots = await LootTransaction.find({
        user_id: userId,
        createdAt: { $gte: startOfDay },
    }).sort({ createdAt: -1 });

    // Check daily limit
    if (todayLoots.length >= 10) {
        return res.status(429).json({
            success: false,
            message: 'Daily loot limit (10) reached. Try again tomorrow.',
        });
    }

    // Check 2-minute cooldown
    if (todayLoots.length > 0) {
        const lastLootTime = todayLoots[0].createdAt;
        const timeDiff = now - lastLootTime;
        if (timeDiff < 2 * 60 * 1000) {
            const secondsLeft = Math.ceil((2 * 60 * 1000 - timeDiff) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${secondsLeft} seconds before opening loot again.`,
            });
        }
    }

    // Generate random loot reward
    const reward = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

    // Update user's wallet
    const user = await User.findById(userId);
    user.wallet_balance = (user.wallet_balance || 0) + reward;
    await user.save();

    // Save transaction
    await LootTransaction.create({
        user_id: userId,
        amount: reward,
    });

    await logWalletTransaction({
        userId: user._id,
        amount: reward,
        type: 'credit',
        reason: 'daily_loot',
        description: `Received ₹${reward} from Daily Loot`,
    });

    return res.json({
        success: true,
        message: `You received ₹${reward} from loot!`,
        wallet: user.wallet,
        lootsLeft: 10 - (todayLoots.length + 1),
    });
});


module.exports = router;