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
      // objectId -> { position, quaternion, placedBy, placedAt }
      objects: new Map(),
    });
    socketToRoom.set(socket.id, code);

    socket.join(code);
    socket.data.room = code;
    socket.data.role = "host";
    socket.emit("room-created", { code });
  };
}

export function createJoinRoomHandler(io, rooms, socket, socketToRoom) {
  return function joinRoom(code, callback) {
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

    // Send existing placed objects so a guest joining after objects
    // already exist doesn't have to wait for the next placement to
    // see anything.
    const objects = [...room.objects.entries()].map(([objectId, record]) => ({
      objectId,
      ...record,
    }));

    respond({ code, objects });
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

// ---- Object placement relay ----
// No game rules here (tic-tac-toe rules / assets are separate issues) —
// this only relays "an object exists at this pose" between the two
// clients in a room, keyed by a client-generated objectId.

function isValidVector3(v) {
  return (
    v &&
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number"
  );
}

function isValidQuaternion(q) {
  return (
    q &&
    typeof q.x === "number" &&
    typeof q.y === "number" &&
    typeof q.z === "number" &&
    typeof q.w === "number"
  );
}

export function createPlaceObjectHandler(io, rooms, socket) {
  return function placeObject(payload, callback) {
    const respond = typeof callback === "function" ? callback : () => {};
    const { code, objectId, position, quaternion } = payload ?? {};

    const room = rooms.get(code);

    // Sender must actually be a member of the room they claim, and
    // must have a role assigned by the server at join time — never
    // trust a role the client sends itself.
    if (!room || socket.data.room !== code || !socket.data.role) {
      return respond({ error: "Not in this room" });
    }

    if (typeof objectId !== "string" || !objectId) {
      return respond({ error: "Missing objectId" });
    }

    if (!isValidVector3(position) || !isValidQuaternion(quaternion)) {
      return respond({ error: "Invalid position/quaternion" });
    }

    const record = {
      position,
      quaternion,
      placedBy: socket.data.role, // "host" | "guest", from the server's own tracking
      placedAt: Date.now(),
    };

    room.objects.set(objectId, record);

    respond({ ok: true });
    io.to(code).emit("object-placed", { objectId, ...record });
  };
}

export function createRemoveObjectHandler(io, rooms, socket) {
  return function re2moveObject(payload, callback) {
    const respond = typeof callback === "function" ? callback : () => {};
    const { code, objectId } = payload ?? {};

    const room = rooms.get(code);

    if (!room || socket.data.room !== code || !socket.data.role) {
      return respond({ error: "Not in this room" });
    }

    if (!room.objects.has(objectId)) {
      return respond({ error: "Object not found" });
    }

    room.objects.delete(objectId);

    respond({ ok: true });
    io.to(code).emit("object-removed", { objectId });
  };
}