import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";

type VideoParticipant = {
  socketId: string;
  userId: string;
  displayName: string;
  role?: "admin" | "manager" | "employee" | "supplier";
};

type JoinRoomPayload = {
  roomId?: unknown;
  displayName?: unknown;
};

type SignalPayload = {
  to?: unknown;
  description?: unknown;
  candidate?: unknown;
};

type JoinRoomResponse = {
  ok: boolean;
  roomId?: string;
  socketId?: string;
  participants?: VideoParticipant[];
  error?: string;
};

type SocketData = {
  userId: string;
  role?: "admin" | "manager" | "employee" | "supplier";
};

const roomParticipants = new Map<string, Map<string, VideoParticipant>>();
const socketRooms = new Map<string, string>();
const MAX_ROOM_PARTICIPANTS = 6;

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGIN
    || process.env.FRONTEND_ORIGIN
    || process.env.FRONTEND_BASE_URL
    || "http://localhost:3001,http://127.0.0.1:3001";

  return configuredOrigins
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function normalizeRoomId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function normalizeDisplayName(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().slice(0, 80) || fallback;
}

function getParticipantRoom(socketId: string) {
  return socketRooms.get(socketId);
}

function getRoomState(roomId: string) {
  let state = roomParticipants.get(roomId);

  if (!state) {
    state = new Map<string, VideoParticipant>();
    roomParticipants.set(roomId, state);
  }

  return state;
}

function emitRoomCount(io: Server, roomId: string) {
  const count = roomParticipants.get(roomId)?.size ?? 0;
  io.to(roomId).emit("video:participant-count", { roomId, count });
}

function leaveVideoRoom(io: Server, socket: Socket, broadcast = true) {
  const roomId = getParticipantRoom(socket.id);

  if (!roomId) {
    return;
  }

  const state = roomParticipants.get(roomId);
  const participant = state?.get(socket.id);

  state?.delete(socket.id);
  socketRooms.delete(socket.id);
  socket.leave(roomId);

  if (state && state.size === 0) {
    roomParticipants.delete(roomId);
  }

  if (broadcast) {
    const payload: { roomId: string; socketId: string; userId?: string } = {
      roomId,
      socketId: socket.id
    };

    if (participant?.userId) {
      payload.userId = participant.userId;
    }

    socket.to(roomId).emit("video:participant-left", payload);
    emitRoomCount(io, roomId);
  }
}

function getSignalTarget(socket: Socket, payload: SignalPayload) {
  if (typeof payload.to !== "string" || !payload.to) {
    return null;
  }

  const roomId = getParticipantRoom(socket.id);

  if (!roomId) {
    return null;
  }

  const participant = roomParticipants.get(roomId)?.get(payload.to);

  return participant ? { roomId, socketId: payload.to } : null;
}

export function attachVideoSignaling(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || !token) {
      next(new Error("Authentification requise"));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      if (payload.role) {
        socket.data.role = payload.role;
      }
      next();
    } catch {
      next(new Error("Session expiree"));
    }
  });

  io.on("connection", (socket: Socket & { data: SocketData }) => {
    socket.on("video:join-room", (payload: JoinRoomPayload, callback?: (response: JoinRoomResponse) => void) => {
      const roomId = normalizeRoomId(payload?.roomId);

      if (!roomId) {
        callback?.({ ok: false, error: "Room invalide" });
        return;
      }

      leaveVideoRoom(io, socket, false);

      const state = getRoomState(roomId);
      const participants = [...state.values()];

      if (participants.length >= MAX_ROOM_PARTICIPANTS) {
        callback?.({ ok: false, error: "Room pleine" });
        return;
      }

      const participant: VideoParticipant = {
        socketId: socket.id,
        userId: socket.data.userId,
        displayName: normalizeDisplayName(payload?.displayName, "Participant")
      };

      if (socket.data.role) {
        participant.role = socket.data.role;
      }

      state.set(socket.id, participant);
      socketRooms.set(socket.id, roomId);
      socket.join(roomId);

      callback?.({
        ok: true,
        roomId,
        socketId: socket.id,
        participants
      });

      socket.to(roomId).emit("video:participant-joined", {
        roomId,
        participant
      });
      emitRoomCount(io, roomId);
    });

    socket.on("video:leave-room", () => {
      leaveVideoRoom(io, socket);
    });

    socket.on("video:offer", (payload: SignalPayload) => {
      const target = getSignalTarget(socket, payload);

      if (!target || !payload.description) {
        return;
      }

      socket.to(target.socketId).emit("video:offer", {
        roomId: target.roomId,
        from: socket.id,
        description: payload.description
      });
    });

    socket.on("video:answer", (payload: SignalPayload) => {
      const target = getSignalTarget(socket, payload);

      if (!target || !payload.description) {
        return;
      }

      socket.to(target.socketId).emit("video:answer", {
        roomId: target.roomId,
        from: socket.id,
        description: payload.description
      });
    });

    socket.on("video:ice-candidate", (payload: SignalPayload) => {
      const target = getSignalTarget(socket, payload);

      if (!target || !payload.candidate) {
        return;
      }

      socket.to(target.socketId).emit("video:ice-candidate", {
        roomId: target.roomId,
        from: socket.id,
        candidate: payload.candidate
      });
    });

    socket.on("disconnect", () => {
      leaveVideoRoom(io, socket);
    });
  });

  return io;
}
