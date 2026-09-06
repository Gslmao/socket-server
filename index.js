import { Server } from "socket.io";

const io = new Server(process.env.PORT || 6969, {
  cors: { origin: "*" }
});

// roomCode -> { host: socketId, guest: socketId|null, createdAt: number }
const rooms = new Map();

function generateCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code)); // avoid collisions
  return code;
}

io.on("connection", (socket) => {
  socket.on("create-room", (callback) => {
    const code = generateCode();
    console.log('lmao')
    rooms.set(code, { host: socket.id, guest: null, createdAt: Date.now() });

    socket.join(code);
    socket.data.room = code;
    socket.data.role = "host";

    if (typeof callback === "function") {
      callback({ code });
    } else {
      socket.send("FUCK YOU")
    }
  });

  socket.on("join-room", (code, callback) => {
    const room = rooms.get(code);
    const respond = typeof callback === "function" ? callback : () => {};

    if (!room) return respond({ error: "Room not found" });
    if (room.guest) return respond({ error: "Room full" });

    room.guest = socket.id;
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

    socket.data.room = null;
    socket.data.role = null;
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    if (code && rooms.has(code)) {
      socket.to(code).emit("opponent-left");
      rooms.delete(code);
    }
    console.log("disconnected:", socket.id);
  });
});

console.log("Socket.io server running");
