const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bootController = require('../controllers/admin/bootController');

// Fetch all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Boot routes
router.get('/boots', bootController.getAllBoots);          // Get all
router.post('/boots', bootController.createBoot);          // Create
router.get('/boots/:id', bootController.getBootById);      // Get by ID
router.put('/boots/:id', bootController.updateBootById);   // Update by ID
router.delete('/boots/:id', bootController.deleteBootById); // Delete by ID

module.exports = router;
