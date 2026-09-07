import { Server } from "socket.io";
import {
  createDisconnectHandler,
  createJoinRoomHandler,
  createLeaveRoomHandler,
  createRoomHandler,
  createStartMessageIntervalHandler,
  createStopMessageIntervalHandler,
} from "./socket-handlers.js";

const io = new Server(process.env.PORT || 6969, {
  cors: { origin: "*" }
});

// roomCode -> { host: socketId, guest: socketId|null, createdAt: number }
const rooms = new Map();
// socketId -> roomCode
const socketToRoom = new Map();

io.on("connection", (socket) => {
  const startMessageInterval = createStartMessageIntervalHandler(io, rooms, socket);
  const stopMessageInterval = createStopMessageIntervalHandler(rooms, socket);
  const createRoom = createRoomHandler(socket, rooms, socketToRoom);
  const joinRoom = createJoinRoomHandler(io, rooms, socket, socketToRoom);
  const leaveRoom = createLeaveRoomHandler(rooms, socket, socketToRoom);
  const disconnect = createDisconnectHandler(rooms, socket, socketToRoom);

  socket.on("start-message-interval", startMessageInterval);
  socket.on("stop-message-interval", stopMessageInterval);
  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
  socket.on("leave-room", leaveRoom);
  socket.on("disconnect", disconnect);
});

console.log("Socket.io server running");
