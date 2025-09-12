const { Server } = require("socket.io");
const Room = require('../models/Room');

let io;


let userSockets = {};
// Player joins a room

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*", // change to your frontend domain
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("joinRoom", async ({ roomId, userId }) => {
            socket.join(roomId); // Join socket room
            console.log(`User ${userId} joined room ${roomId}`);
            userSockets[userId] = socket.id;
            // Notify other players
            io.to(roomId).emit("playerJoined", { userId, roomId });
            io.to(roomId).emit("room_state", await getRoomState(roomId));
        });

        // Player leaves a room
        socket.on("leaveRoom", ({ roomId, userId }) => {
            socket.leave(roomId);
            console.log(`User ${userId} left room ${roomId}`);

            // Notify others
            io.to(roomId).emit("playerLeft", { userId, roomId });
            io.to(roomId).emit("room_state", getRoomState(roomId));
            delete userSockets[userId];
        });

        // --- Start Round ---
        socket.on("round_start", ({ roomId }) => {
            console.log(`Round started in ${roomId}`);

            // shuffle/deal logic here
            io.to(roomId).emit("round_start", { roomId });
            io.to(roomId).emit("room_state", getRoomState(roomId));
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



        // ---boot collet
        socket.on("boot_collect", ({ roomId, bootAmount, totalPot, tableBet, collectedFrom }) => {
            console.log(`Boot collected in room ${roomId}, bootAmount: ${bootAmount}, totalPot: ${totalPot}`);

            io.emit("boot_collect", {
                room_id: roomId,
                boot_amount: bootAmount,
                collected_from: collectedFrom,  // [{ user_id, seat, amount, wallet_after }]
                total_pot: totalPot,
                table_bet: tableBet
            });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        // --- Deal Cards ---
        socket.on("deal_cards", ({ roomId, players }) => {
            console.log(`Dealing cards in room ${roomId}`);

            // players = [ { user_id, seat, cards: [..] }, ... ]
            io.to(roomId).emit("deal_cards", {
                room_id: roomId,
                players: players
            });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        socket.on("turn_changed", ({ roomId, userId, seat }) => {
            console.log(`Turn changed in room ${roomId}, now it's user ${userId} (seat ${seat})`);

            io.emit("turn_changed", {
                room_id: roomId,
                user_id: userId,
                seat: seat
            });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });


        // --- Bet Placed ---
        socket.on("bet_placed", ({ roomId, userId, seat, amount, type, pot, tableBet }) => {
            console.log(`User ${userId} placed a ${type} bet of ${amount} in room ${roomId}`);

            io.to(roomId).emit("bet_placed", {
                room_id: roomId,
                user_id: userId,
                seat: seat,
                amount: amount,
                type: type,        // e.g., "blind" or "chaal"
                pot: pot,
                table_bet: tableBet
            });
            io.to(roomId).emit("room_state", getRoomState(roomId));
        });

        // --- Wallet Update ---
        socket.on("wallet_update", ({ roomId, userId, wallet }) => {
            console.log(`Wallet updated for user ${userId} in room ${roomId}: ${wallet}`);

            io.to(roomId).emit("wallet_update", {
                room_id: roomId,
                user_id: userId,
                wallet: wallet
            });
        });

        // --- SideShow Request ---
        socket.on("sideshow_request", ({ roomId, fromUserId, fromSeat, toUserId, toSeat }) => {
            console.log(`SideShow request from ${fromUserId} (seat ${fromSeat}) to ${toUserId} (seat ${toSeat}) in room ${roomId}`);

            // Forward request to the target player only
            // Assuming you have a mapping of userId -> socket.id, e.g., `userSockets[toUserId]`
            const targetSocketId = userSockets[toUserId];
            if (targetSocketId) {
                io.to(targetSocketId).emit("sideshow_request", {
                    room_id: roomId,
                    from_user_id: fromUserId,
                    from_seat: fromSeat,
                    to_user_id: toUserId,
                    to_seat: toSeat
                });
            }
        });

        // --- SideShow Response ---
        socket.on("sideshow_response", ({ roomId, requesterUserId, targetUserId, accepted }) => {
            console.log(`SideShow response from ${targetUserId} to ${requesterUserId} in room ${roomId}: ${accepted}`);

            io.to(roomId).emit("sideshow_response", {
                room_id: roomId,
                requester_user_id: requesterUserId,
                target_user_id: targetUserId,
                accepted: accepted
            });
        });

        // --- Show Result ---
        socket.on("show_result", ({ roomId, winnerUserId, winnerSeat, amountWon, hands }) => {
            console.log(`Showdown in room ${roomId}, winner: ${winnerUserId} (seat ${winnerSeat}), amount won: ${amountWon}`);

            io.to(roomId).emit("show_result", {
                room_id: roomId,
                winner_user_id: winnerUserId,
                winner_seat: winnerSeat,
                amount_won: amountWon,
                hands: hands // [{ user_id, seat, cards: [], hand }]
            });
        });


        // --- Game Completed ---
        socket.on("game_completed", ({ roomId, winnerUserId, winnerSeat, amountWon }) => {
            console.log(`Game completed in room ${roomId}, winner: ${winnerUserId} (seat ${winnerSeat}), amount won: ${amountWon}`);

            io.to(roomId).emit("game_completed", {
                room_id: roomId,
                winner_user_id: winnerUserId,
                winner_seat: winnerSeat,
                amount_won: amountWon
            });
        });

        // --- Round Restart ---
        socket.on("round_restart", ({ roomId, nextInSeconds }) => {
            console.log(`Next round in room ${roomId} will start in ${nextInSeconds} seconds`);

            io.to(roomId).emit("round_restart", {
                room_id: roomId,
                next_in_seconds: nextInSeconds
            });
        });

        socket.on("dealer_decide", async ({ roomId, userId, seat }) => {
            console.log(`Dealer decided in room ${roomId}, dealer: ${userId} (seat ${seat})`);

            // 1. Update DB (optional if you want persistence)
            await Room.updateOne(
                { roomId },
                { $set: { dealer: { userId, seat } } }
            );

            // 2. Emit dealer_decide event
            io.to(roomId).emit("dealer_decide", {
                room_id: roomId,
                user_id: userId,
                seat: seat
            });

            // 3. Emit updated room state
            const state = await getRoomState(roomId);
            io.to(roomId).emit("room_state", state);
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
    try {
        // if roomId is not ObjectId, try findOne by custom roomId field
        let room;

        if (/^[0-9a-fA-F]{24}$/.test(roomId)) {
            // valid ObjectId → query by _id
            room = await Room.findById(roomId).populate("players");
        } else {
            // fallback → query by custom field "roomId"
            room = await Room.findOne({ roomId }).populate("players");
        }

        return room || null;
    } catch (err) {
        console.error("❌ Error fetching room state:", err);
        return null;
    }
}

module.exports = { initSocket, getIO };
