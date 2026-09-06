import { Server } from "socket.io";

const io = new Server(process.env.PORT || 6969, {
  cors: { origin: "*" }
});

// roomCode -> { host: socketId, guest: socketId|null, createdAt: number }
const rooms = new Map();
// socketId -> roomCode
const socketToRoom = new Map();

function generateCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code)); // avoid collisions
  return code;
}

io.on("connection", (socket) => {
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
    rooms.set(code, { host: socket.id, guest: null, createdAt: Date.now() });
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
      socket.to(code).emit("opponent-left");
      rooms.delete(code);
    }
    socketToRoom.delete(socket.id);
    console.log("disconnected:", socket.id);
  });
});

console.log("Socket.io server running");
