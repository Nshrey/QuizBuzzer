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
let adminSocketId = null;

const players = new Map();

function sendPlayers() {
  console.log("Current players:", [...players.values()]);
  io.emit("players", [...players.values()]);
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.emit("players", [...players.values()]);
  socket.emit("winner", winner);

  socket.on("admin", () => {
    adminSocketId = socket.id;
    console.log("Admin connected:", socket.id);
  });

  socket.on("join", (playerName) => {
    const name = playerName.trim();

    if (!name) return;

    players.set(socket.id, name);

    console.log("Player joined:", name);

    sendPlayers();
  });

  socket.on("buzz", () => {
    const playerName = players.get(socket.id);
  
    console.log(
      "Buzz received:",
      socket.id,
      "player:",
      playerName,
      "current winner:",
      winner
    );
  
    if (!playerName || winner !== null) return;
  
    winner = playerName;
  
    console.log("Winner:", winner);
  
    io.emit("winner", winner);
  });

  socket.on("reset", () => {
    if (socket.id !== adminSocketId) {
      console.log("Unauthorized reset attempt:", socket.id);
      return;
    }

    winner = null;

    io.emit("reset");

    console.log("Round reset");
  });

  socket.on("disconnect", () => {
    const playerName = players.get(socket.id);

    players.delete(socket.id);

    if (playerName) {
      console.log("Player disconnected:", playerName);
      sendPlayers();
    }

    if (socket.id === adminSocketId) {
      adminSocketId = null;
      console.log("Admin disconnected");
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Buzzer server running on port ${PORT}`);
});