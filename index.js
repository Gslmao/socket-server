import { Server } from "socket.io";

const io = new Server(process.env.PORT || 6969, {
  cors: { origin: "*" }
});

// roomCode -> { host: socketId, guest: socketId|null, createdAt: number }
const rooms = new Map();
// socketId -> roomCode
const socketToRoom = new Map();

function stopRoomMessageInterval(code) {
  const room = rooms.get(code);
  if (!room) return;

  clearInterval(room.messageInterval);
  room.messageInterval = null;
}

function generateCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code)); // avoid collisions
  return code;
}

io.on("connection", (socket) => {
  socket.on("start-message-interval", (code) => {
    const room = rooms.get(code);
    if (!room || !socket.rooms.has(code)) return;
    if (room.messageInterval) return;

    const intervalMs = 1000;
    room.messageInterval = setInterval(() => {
      io.to(code).emit("server-message", {
        message: "Message from the server",
        sentAt: room.messageCount++,
      });
    }, intervalMs);
  });

  socket.on("stop-message-interval", () => {
    stopRoomMessageInterval(socket.data.room);
  });

  socket.on("create-room", (callback) => {
    const existingRoom = socketToRoom.get(socket.id);
    if (existingRoom) {
      if (typeof callback === "function") {
        return callback({ error: "You already created a room for this connection" });
      }
      return;
    }

    const code = generateCode();
    console.log(code, "created by", socket.id);
    rooms.set(code, {
      host: socket.id,
      guest: null,
      createdAt: Date.now(),
      messageInterval: null,
      messageCount: 0,
    });
    socketToRoom.set(socket.id, code);

    socket.join(code);
    socket.data.room = code;
    socket.data.role = "host";
    socket.emit("room-created", { code });
  });

  socket.on("join-room", (code, callback) => {
    const room = rooms.get(code);
    const respond = typeof callback === "function" ? callback : () => {};

    if (!room) return respond({ error: "Room not found" });
    if (room.guest) return respond({ error: "Room full" });
    if (socketToRoom.has(socket.id)) return respond({ error: "You already joined a room on this connection" });

    room.guest = socket.id;
    socketToRoom.set(socket.id, code);
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "guest";

    respond({ code });
    io.to(code).emit("match-found", { code });
  });

  socket.on("leave-room", (code) => {
    const room = rooms.get(code);
    if (!room) return;

    stopRoomMessageInterval(code);
    socket.leave(code);
    socket.to(code).emit("opponent-left");
    rooms.delete(code);
    socketToRoom.delete(socket.id);

    socket.data.room = null;
    socket.data.role = null;
  });

  socket.on("disconnect", () => {
    const code = socket.data.room ?? socketToRoom.get(socket.id);
    if (code && rooms.has(code)) {
      stopRoomMessageInterval(code);
      socket.to(code).emit("opponent-left");
      rooms.delete(code);
    }
    socketToRoom.delete(socket.id);
    console.log("disconnected:", socket.id);
  });
});

console.log("Socket.io server running");
