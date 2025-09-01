const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Boot = require('../models/Boot');
const Room = require('../models/Room');
const Bet = require('../models/Bet');
const { logWalletTransaction } = require('../helpers/wallet');
const { getIO } = require("../config/socket");


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
        const player = await User.findById(userId);
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
                players: [userId],
            });

            await room.save();
        } else {
            // Join existing room
            if (!room.players.includes(userId)) {
                room.players.push(userId);
                await room.save();
            }
        }

        const io = getIO();
        io.to(room._id.toString()).emit("playerJoined", { userId, roomId: room._id });


        res.status(200).json({
            message: 'Joined room successfully',
            room,
            player
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

        const io = getIO();
        io.to(room._id.toString()).emit("playerLeft", { userId, roomId: room._id });

        return res.status(200).json({
            message: 'Exited the game successfully',
            room_id
        });
    } catch (error) {
        console.error('Error exiting game:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



exports.placeBet = async (req, res) => {
    const userId = req.user.id;
    const { room_id, amount, type } = req.body || {};

    const errors = {};
    if (!room_id) errors.room_id = 'room_id is required';
    if (!amount || amount <= 0) errors.amount = 'Valid amount is required';
    if (!type) errors.type = 'type is required (e.g., blind, chaal, pack)';

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ message: 'Validation Error', errors });
    }

    try {
        const room = await Room.findById(room_id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        // Ensure player is in room
        if (!room.players.includes(userId)) {
            return res.status(403).json({ message: 'You are not in this room' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check wallet (assume you have a `wallet_balance` field)
        if (user.wallet_balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct from user wallet (basic way, you can use transactions if needed)
        user.wallet_balance -= amount;
        await user.save();

        // Create Bet entry
        const bet = new Bet({
            room_id,
            user_id: userId,
            amount,
            type,
            is_blind: type === 'blind'
        });

        await bet.save();

        await logWalletTransaction({
            userId: userId,
            amount,
            type: 'debit',
            reason: 'bet',
            description: `Placed a ${type} bet of ₹${amount}`
        });

        // Optionally update pot amount or room stake if needed
        room.total_pot = (room.total_pot || 0) + amount;
        await room.save();


        const io = getIO();
        io.to(room_id).emit("betPlaced", {
            room_id,
            user_id: userId,
            amount,
            type,
            new_pot: room.total_pot,
            wallet_balance: user.wallet_balance
        });

        res.status(200).json({
            message: 'Bet placed successfully',
            bet
        });

    } catch (err) {
        console.error('Bet error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};




exports.completeGame = async (req, res) => {
    try {

        const { room_id } = req.body || {};
        const errors = {};

        if (!room_id) {
            Object.assign(errors, formatError('room_id', 'The room_id field is required.'));
        }

        if (Object.keys(errors).length > 0) {
            return res.status(422).json({ message: 'Validation Error', errors });
        }

        const result = await completeRoomAndDeclareWinner(room_id);
        if (result.error) return res.status(400).json({ message: result.error });
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching boots:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Function declared at top or before usage
async function completeRoomAndDeclareWinner(room_id) {
    try {
        const room = await Room.findById(room_id);
        if (!room || room.status === 'completed') {
            return { error: 'Room not found or already completed' };
        }

        // if (!room.players || room.players.length < 2) {
        //     return { error: 'Not enough players to complete the game' };
        // }

        const winnerIndex = Math.floor(Math.random() * room.players.length);
        const winnerId = room.players[winnerIndex];

        const winner = await User.findById(winnerId);
        const winningAmount = room.total_pot || 0;
        winner.wallet_balance += winningAmount;
        await winner.save();

        await logWalletTransaction({
            userId: winner._id,
            amount: winningAmount,
            type: 'credit',
            reason: 'win',
            description: `Won ₹${winningAmount} in Room #${room._id}`
        });

        room.status = 'completed';
        room.winner = winnerId;
        await room.save();

        const io = getIO();
        io.to(room_id).emit("gameCompleted", {
            roomId: room_id,
            result: result, // winners, scores, etc.
            winner: winnerId
        });

        return {
            message: 'Game completed',
            room_id,
            winner: winnerId,
            amount_won: winningAmount
        };
    } catch (error) {
        console.error('Error completing game:', error);
        return { error: 'Failed to complete game' };
    }
}

// Exported route/controller function
exports.completeGame = async (req, res) => {
    try {
        const { room_id } = req.body || {};
        const errors = {};

        if (!room_id) {
            Object.assign(errors, formatError('room_id', 'The room_id field is required.'));
        }

        if (Object.keys(errors).length > 0) {
            return res.status(422).json({ message: 'Validation Error', errors });
        }

        const result = await completeRoomAndDeclareWinner(room_id); // ✅ Direct call
        if (result.error) return res.status(400).json({ message: result.error });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error completing game:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
