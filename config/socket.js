const { Server } = require("socket.io");

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

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
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

module.exports = { initSocket, getIO };
