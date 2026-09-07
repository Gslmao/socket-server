function stopRoomMessageInterval(rooms, code) {
  const room = rooms.get(code);
  if (!room) return;

  clearInterval(room.messageInterval);
  room.messageInterval = null;
}

function generateCode(rooms) {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

export function createStartMessageIntervalHandler(io, rooms, socket) {
  return function startMessageInterval(code) {
    const room = rooms.get(code);
    if (!room || !socket.rooms.has(code) || room.messageInterval) return;

    room.messageInterval = setInterval(() => {
      io.to(code).emit("server-message", {
        message: "Message from the server",
        sentAt: room.messageCount++,
      });
    }, 1000);
  };
}

export function createStopMessageIntervalHandler(rooms, socket) {
  return function stopMessageInterval() {
    stopRoomMessageInterval(rooms, socket.data.room);
  };
}

export function createRoomHandler(socket, rooms, socketToRoom) {
  return function createRoom(callback) {
    const existingRoom = socketToRoom.get(socket.id);
    if (existingRoom) {
      if (typeof callback === "function") {
        return callback({ error: "You already created a room for this connection" });
      }
      return;
    }

    const code = generateCode(rooms);
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
  };
}

export function createJoinRoomHandler(io, rooms, socket, socketToRoom) {
  return function joinRoom(code, isRef, callback) {
    const room = rooms.get(code);
    const respond = typeof callback === "function" ? callback : () => {};

    if (!room) return respond({ error: "Room not found" });
    if (room.guest) return respond({ error: "Room full" });
    if (socketToRoom.has(socket.id)) {
      return respond({ error: "You already joined a room on this connection" });
    }

    room.guest = socket.id;
    socketToRoom.set(socket.id, code);
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "guest";

    respond({ code });
    io.to(code).emit("match-found", { code });
  };
}

export function createLeaveRoomHandler(rooms, socket, socketToRoom) {
  return function leaveRoom(code) {
    const room = rooms.get(code);
    if (!room) return;

    stopRoomMessageInterval(rooms, code);
    socket.leave(code);
    socket.to(code).emit("opponent-left");
    rooms.delete(code);
    socketToRoom.delete(socket.id);

    socket.data.room = null;
    socket.data.role = null;
  };
}

export function createDisconnectHandler(rooms, socket, socketToRoom) {
  return function disconnect() {
    const code = socket.data.room ?? socketToRoom.get(socket.id);
    if (code && rooms.has(code)) {
      stopRoomMessageInterval(rooms, code);
      socket.to(code).emit("opponent-left");
      rooms.delete(code);
    }
    socketToRoom.delete(socket.id);
    console.log("disconnected:", socket.id);
  };
}
