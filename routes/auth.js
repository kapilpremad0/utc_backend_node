const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper: Format validation error
const formatError = (field, message) => ({ [field]: message });

// Helper: Generate player ID
const generatePlayerId = () => 'PLAYER-' + Date.now();

// ==============================
// Register Route
// ==============================
router.post('/register', async (req, res) => {
    try {
        const { user_name, mobile, password } = req.body || {};
        const errors = {};

        if (!user_name) {
            Object.assign(errors, formatError('user_name', 'The user_name field is required.'));
        } else if (typeof user_name !== 'string') {
            Object.assign(errors, formatError('user_name', 'The user_name must be a string.'));
        }

        if (!mobile) {
            Object.assign(errors, formatError('mobile', 'The mobile field is required.'));
        } else if (!/^\d{10}$/.test(mobile)) {
            Object.assign(errors, formatError('mobile', 'The mobile must be a valid 10-digit number.'));
        }

        if (!password) {
            Object.assign(errors, formatError('password', 'The password field is required.'));
        } else if (password.length < 6) {
            Object.assign(errors, formatError('password', 'The password must be at least 6 characters.'));
        }

        if (Object.keys(errors).length > 0) {
            return res.status(422).json({ message: 'Validation Error', errors });
        }

        const userExists = await User.findOne({ mobile });
        if (userExists) {
            return res.status(422).json({
                message: 'Validation Error',
                errors: formatError('mobile', 'Mobile number is already registered')
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const player_id = generatePlayerId();

        const newUser = new User({
            player_id,
            user_name,
            mobile,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(200).json({
            message: 'User registered successfully',
            success: true,
            player_id,
            user_name
        });
    } catch (err) {
        console.error('Register Error:', err);
        return res.status(500).json({
            message: 'Server Error',
            success: false
        });
    }
});

// ==============================
// Login Route
// ==============================
router.post('/login', async (req, res) => {
    try {
        const { mobile, password } = req.body || {};
        const errors = {};

        if (!mobile) {
            Object.assign(errors, formatError('mobile', 'The mobile field is required.'));
        } else if (!/^\d{10}$/.test(mobile)) {
            Object.assign(errors, formatError('mobile', 'The mobile must be a valid 10-digit number.'));
        }

        if (!password) {
            Object.assign(errors, formatError('password', 'The password field is required.'));
        }

        if (Object.keys(errors).length > 0) {
            return res.status(422).json({ message: 'Validation Error', errors });
        }

        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(422).json({
                message: 'Validation Error',
                errors: formatError('mobile', 'This mobile is not registered.')
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(422).json({
                message: 'Validation Error',
                errors: formatError('password', 'The password is incorrect.')
            });
        }

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.json({
            message: 'Login successful',
            token,
            player_id: user.player_id,
            user_name: user.user_name
        });
    } catch (err) {
        console.error('Login Error:', err.message);
        return res.status(500).json({
            message: 'Server Error',
            success: false
        });
    }
});

// ==============================
// Guest Login Route
// ==============================
router.post('/guest-login', async (req, res) => {
    try {
        const player_id = generatePlayerId();
        const user = new User({
            player_id,
            user_name: `Guest${Math.floor(Math.random() * 10000)}`,
            mobile: `000${Math.floor(Math.random() * 1000000000)}`,
            password: await bcrypt.hash('guest1234', 10),
            is_guest: true
        });

        await user.save();

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.json({
            message: 'Guest login successful',
            token,
            player_id,
            user_name: user.user_name
        });
    } catch (err) {
        console.error('Guest Login Error:', err.message);
        return res.status(500).json({
            message: 'Server Error',
            success: false
        });
    }
});

module.exports = router;
