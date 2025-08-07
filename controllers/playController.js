const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Boot = require('../models/Boot');
const Room = require('../models/Room');

const formatError = (field, message) => ({ [field]: message });
const verifyToken = require('../middlewares/auth'); // 👈 Import middleware


exports.bootGameList = async (req, res) => {
    try {
        const boots = await Boot.find();
        res.json(boots);
    } catch (error) {
        console.error('Error fetching boots:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.PlayBootGame = async (req, res) => {

    const {
        boot_id
    } = req.body || {};

    const errors = {};

    if (!boot_id) {
        Object.assign(errors, formatError('boot_id', 'The boot_id field is required.'));
    }

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ message: 'Validation Error', errors });
    }

    const userId = req.user.id;

    try {
        // Find boot data
        const boot = await Boot.findById(boot_id);
        if (!boot) return res.status(404).json({ message: 'Boot not found' });

        // Find existing waiting room with this boot
        let room = await Room.findOne({
            boot_id: boot_id,
            status: 'waiting',
            $expr: { $lt: [{ $size: "$players" }, 5] }
        });

        if (!room) {
            // Create new room with boot data
            room = new Room({
                boot_id: boot._id,
                boot_amount: boot.boot_amount,
                max_blind: boot.max_blind,
                max_chaal: boot.max_chaal,
                max_pot_amount: boot.max_pot_amount,
                min_buy_in: boot.min_buy_in,
                max_buy_in: boot.max_buy_in,
                players: [userId]
            });

            await room.save();
        } else {
            // Join existing room
            if (!room.players.includes(userId)) {
                room.players.push(userId);
                await room.save();
            }
        }

        res.status(200).json({
            message: 'Joined room successfully',
            room
        });

    } catch (error) {
        console.error('Error joining/creating room:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Exit Game Function
exports.exitGame = async (req, res) => {
    const { room_id } = req.body || {};
    const userId = req.user?.id;
    const errors = {};

    if (!room_id) errors.room_id = 'The room_id field is required.';
    if (!userId) return res.status(401).json({ message: 'Unauthorized access' });

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ message: 'Validation Error', errors });
    }

    try {
        const room = await Room.findById(room_id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        if (!room.players.includes(userId)) {
            return res.status(400).json({ message: 'User is not part of this room' });
        }

        room.players = room.players.filter(pid => pid.toString() !== userId);
        await room.save();

        // Optional: delete from Player model if used
        // if (Player) {
        //     await Player.deleteOne({ user_id: userId, room_id });
        // }

        // Optional: delete room if empty
        if (room.players.length === 0) {
            await Room.deleteOne({ _id: room_id });
        }

        return res.status(200).json({
            message: 'Exited the game successfully',
            room_id
        });
    } catch (error) {
        console.error('Error exiting game:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
