const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const Bet = require('../models/Bet');
const WalletTransaction = require('../models/WalletTransaction');
const bootController = require('../controllers/admin/bootController');
const LootTransaction = require('../models/LootTransaction');

// Fetch all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const usersWithAvatarUrls = users.map((user) => {
      const avatarFile = user.avatar
        ? `avatar${user.avatar}.png`
        : 'default.png';

      return {
        ...user._doc,
        avatarUrl: `${baseUrl}/assets/${avatarFile}`,
      };
    });

    res.json(usersWithAvatarUrls);

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/wallet_transactions', async (req, res) => {
  try {
    const transactions = await WalletTransaction.find()
      .populate('user_id', 'user_name avatar player_id') // only fetch user_name & avatar
      .sort({ createdAt: -1 }); // optional: sort by latest

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('players', 'user_name avatar player_id')
      .populate('winner', 'user_name avatar player_id')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/loots', async (req, res) => {
  try {
    const transactions = await LootTransaction.find()
      .populate('user_id', 'user_name avatar player_id')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/room_detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findById(id)
      .populate('players', 'user_name avatar player_id')
      .populate('winner', 'user_name avatar player_id');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const bets = await Bet.find({ room_id: id })
      .populate('user_id', 'user_name avatar') // assuming Bet has a userId ref
      .sort({ createdAt: -1 });

    // 3. Combine data
    const response = {
      ...room.toObject(),
      bets,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching room detail:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const total_users = await User.countDocuments()
    const today_user_registers = await User.countDocuments({ createdAt: { $gte: today } })

    const today_game_played = await Room.countDocuments({ createdAt: { $gte: today } })

    const lootToday = await LootTransaction.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])

    const total_today_loot = lootToday.length > 0 ? lootToday[0].total : 0

    res.json({
      total_users,
      today_game_played,
      total_today_loot,
      today_user_registers,
    })
  } catch (error) {
    console.error('Dashboard Error:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

// Boot routes
router.get('/boots', bootController.getAllBoots);          // Get all
router.post('/boots', bootController.createBoot);          // Create
router.get('/boots/:id', bootController.getBootById);      // Get by ID
router.put('/boots/:id', bootController.updateBootById);   // Update by ID
router.delete('/boots/:id', bootController.deleteBootById); // Delete by ID



module.exports = router;
