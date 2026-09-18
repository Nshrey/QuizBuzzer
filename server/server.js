const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://quiz-buzzer-steel.vercel.app",
    ],
  },
});

let winner = null;

// Stores every buzz received during the current round
let buzzes = [];

// socket.id -> player name
const players = new Map();

function sendPlayers() {
  console.log("Current players:", [...players.values()]);
  io.emit("players", [...players.values()]);
}

function sendBuzzOrder() {
  // IMPORTANT:
  // Only admins receive detailed buzz information.
  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.isAdmin) {
      socket.emit("buzzOrder", buzzes);
    }
  }
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.emit("players", [...players.values()]);

  // Players only need to know whether the round is locked.
  socket.emit("roundState", {
    locked: winner !== null,
  });

  // -------------------------
  // ADMIN
  // -------------------------

  socket.on("admin", (code, callback) => {
    if (code !== "5642") {
      console.log("Invalid admin login attempt:", socket.id);
  
      if (callback) {
        callback({ success: false });
      }
  
      return;
    }
  
    socket.isAdmin = true;
  
    console.log("Admin authenticated:", socket.id);
  
    socket.emit("adminWinner", winner);
    socket.emit("buzzOrder", buzzes);
  
    if (callback) {
      callback({ success: true });
    }
  });

  // -------------------------
  // PLAYER JOIN
  // -------------------------

  socket.on("join", (playerName) => {
    if (typeof playerName !== "string") return;

    const name = playerName.trim();

    if (!name) return;

    players.set(socket.id, name);

    console.log("Player joined:", name);

    sendPlayers();
  });

  // -------------------------
  // BUZZ
  // -------------------------

  socket.on("buzz", () => {
    const playerName = players.get(socket.id);

    if (!playerName) return;

    // Each socket can only buzz once per round
    const alreadyBuzzed = buzzes.some(
      (buzz) => buzz.socketId === socket.id
    );

    if (alreadyBuzzed) return;

    const timestamp = process.hrtime.bigint();

    // First buzz starts the round clock
    if (buzzes.length === 0) {
      winner = playerName;

      buzzes.push({
        socketId: socket.id,
        player: playerName,
        offsetMs: 0,
        timestamp: timestamp.toString(),
      });

      console.log(`Winner: ${playerName}`);

      // Tell everybody the round is locked.
      // Winner identity is NOT included.
      io.emit("roundState", {
        locked: true,
      });

      // Winner identity goes only to admins.
      for (const [, connectedSocket] of io.sockets.sockets) {
        if (connectedSocket.isAdmin) {
          connectedSocket.emit("adminWinner", winner);
        }
      }

      sendBuzzOrder();

      return;
    }

    // -------------------------
    // LATER BUZZES
    // -------------------------

    const firstTimestamp = BigInt(buzzes[0].timestamp);

    const differenceNs = timestamp - firstTimestamp;

    const offsetMs =
      Number(differenceNs) / 1_000_000;

    buzzes.push({
      socketId: socket.id,
      player: playerName,
      offsetMs: Math.round(offsetMs),
      timestamp: timestamp.toString(),
    });

    console.log(
      `Buzz: ${playerName} +${Math.round(offsetMs)}ms`
    );

    sendBuzzOrder();
  });

  // -------------------------
  // RESET
  // -------------------------

  socket.on("reset", () => {
    if (!socket.isAdmin) {
      console.log(
        "Unauthorized reset attempt:",
        socket.id
      );
      return;
    }

    winner = null;
    buzzes = [];

    io.emit("roundState", {
      locked: false,
    });

    for (const [, connectedSocket] of io.sockets.sockets) {
      if (connectedSocket.isAdmin) {
        connectedSocket.emit("adminWinner", null);
        connectedSocket.emit("buzzOrder", []);
      }
    }

    console.log("Round reset");
  });

  // -------------------------
  // DISCONNECT
  // -------------------------

  socket.on("disconnect", () => {
    const playerName = players.get(socket.id);

    players.delete(socket.id);

    if (playerName) {
      console.log("Player disconnected:", playerName);
      sendPlayers();
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Buzzer server running on port ${PORT}`);
});