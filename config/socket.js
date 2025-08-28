const { Server } = require("socket.io");
const Room = require('../models/Room');

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*", // change to your frontend domain
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        // Player joins a room


        socket.on("joinRoom", ({ roomId, userId }) => {
            socket.join(roomId); // Join socket room
            console.log(`User ${userId} joined room ${roomId}`);

            // Notify other players
            io.to(roomId).emit("playerJoined", { userId, roomId });
        });

        // Player leaves a room
        socket.on("leaveRoom", ({ roomId, userId }) => {
            socket.leave(roomId);
            console.log(`User ${userId} left room ${roomId}`);

            // Notify others
            io.to(roomId).emit("playerLeft", { userId, roomId });
        });

        // --- Start Round ---
        socket.on("round_start", ({ roomId }) => {
            console.log(`Round started in ${roomId}`);

            // shuffle/deal logic here
            io.to(roomId).emit("round_start", { roomId });
        });

        // --- Place Bet (Chaal / Blind) ---
        socket.on("bet_request", ({ roomId, userId, amount, type }) => {
            console.log(`Bet: ${userId} -> ${amount} (${type})`);

            // validate wallet, turn, etc
            io.to(roomId).emit("bet_placed", { userId, amount, type });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        // --- See Cards ---
        socket.on("see_request", ({ roomId, userId }) => {
            console.log(`User ${userId} wants to see cards`);

            io.to(roomId).emit("player_seen", { userId });
        });

        // --- Pack (Fold) ---
        socket.on("pack_request", ({ roomId, userId }) => {
            console.log(`User ${userId} packed`);

            io.to(roomId).emit("player_packed", { userId });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        // --- Side Show ---
        socket.on("sideshow_request", ({ roomId, fromUserId, targetId }) => {
            console.log(`SideShow: ${fromUserId} -> ${targetId}`);

            // Ask target to accept/reject
            io.to(roomId).emit("sideshow_result", {
                fromUserId, targetId, accepted: true // or false
            });

            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        // --- Show (Final showdown) ---
        socket.on("show_request", ({ roomId, userId }) => {
            console.log(`Show requested in ${roomId} by ${userId}`);

            io.to(roomId).emit("show_result", { winnerId: userId }); // real logic later
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        // --- Wallet Update ---
        function updateWallet(roomId, userId, balance) {
            io.to(roomId).emit("wallet_update", { userId, balance });
        }

        // --- Game Complete ---
        function gameComplete(roomId, winnerId, amountWon) {
            io.to(roomId).emit("game_completed", { winnerId, amountWon });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        }


        // Handle disconnect
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });


        socket.onAny((event, data) => {
            console.log("📡 Event received:", event, data);
        });

    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}

async function getRoomState(roomId) {
    const room = await Room.findOne({ roomId });
    if (!room) return null;

    

    return room;
}

module.exports = { initSocket, getIO };
