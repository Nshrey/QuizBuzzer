import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("https://quizbuzzerserver.onrender.com");

function App() {
  const isAdmin = window.location.pathname === "/admin";

  const [name, setName] = useState("");
  const [playerName, setPlayerName] = useState(
    sessionStorage.getItem("playerName") || ""
  );
  const [winner, setWinner] = useState(null);
  const [players, setPlayers] = useState([]);

  // Listen for game events
  useEffect(() => {
    const onWinner = (winnerName) => setWinner(winnerName);
    const onReset = () => setWinner(null);
    const onPlayers = (playerList) => setPlayers(playerList);

    socket.on("winner", onWinner);
    socket.on("reset", onReset);
    socket.on("players", onPlayers);

    return () => {
      socket.off("winner", onWinner);
      socket.off("reset", onReset);
      socket.off("players", onPlayers);
    };
  }, []);

  // Register admin and re-register after reconnect
  useEffect(() => {
    if (!isAdmin) return;

    const registerAdmin = () => {
      socket.emit("admin");
    };

    if (socket.connected) {
      registerAdmin();
    }

    socket.on("connect", registerAdmin);

    return () => {
      socket.off("connect", registerAdmin);
    };
  }, [isAdmin]);

  // Re-register player after refresh/reconnect
  useEffect(() => {
    if (isAdmin || !playerName) return;

    const registerPlayer = () => {
      socket.emit("join", playerName);
    };

    if (socket.connected) {
      registerPlayer();
    }

    socket.on("connect", registerPlayer);

    return () => {
      socket.off("connect", registerPlayer);
    };
  }, [isAdmin, playerName]);

  const join = (e) => {
    e.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) return;

    sessionStorage.setItem("playerName", cleanName);
    setPlayerName(cleanName);

    socket.emit("join", cleanName);
  };

  const buzz = () => {
    if (!playerName || winner) return;

    socket.emit("buzz");
  };

  if (isAdmin) {
    return (
      <main className="admin">
        <p className="eyebrow">FASTEST FINGER</p>
        <h1>Quiz Buzzer</h1>

        {!winner && (
          <div className="players">
            <p className="eyebrow">PLAYERS</p>

            {players.length === 0 ? (
              <p>No players connected</p>
            ) : (
              players.map((player, index) => (
                <div className="player-row" key={index}>
                  <span>●</span>
                  {player}
                </div>
              ))
            )}

            <p className="player-count">
              {players.length} PLAYER
              {players.length !== 1 ? "S" : ""} CONNECTED
            </p>
          </div>
        )}

        {winner ? (
          <div className="winner">
            <p>FIRST TO BUZZ</p>

            <h2>{winner}</h2>

            <button
              className="reset-button"
              onClick={() => socket.emit("reset")}
            >
              RESET
            </button>
          </div>
        ) : (
          <div className="waiting">
            <span>●</span>
            Waiting for buzz...
          </div>
        )}
      </main>
    );
  }

  if (!playerName) {
    return (
      <main className="join">
        <form onSubmit={join}>
          <p className="eyebrow">FASTEST FINGER</p>

          <h1>Ready to play?</h1>

          <input
            autoFocus
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button type="submit">
            JOIN
          </button>
        </form>
      </main>
    );
  }

  const didWin = winner === playerName;

  return (
    <main className="player">
      <p className="player-name">{playerName}</p>

      {!winner ? (
        <>
          <button
            className="buzz-button"
            onClick={buzz}
          >
            BUZZ!
          </button>

          <p className="status ready">
            ● READY
          </p>
        </>
      ) : didWin ? (
        <div className="result">
          <div className="trophy">🏆</div>

          <h1>YOU'RE FIRST!</h1>

          <p>Wait for the question master.</p>
        </div>
      ) : (
        <div className="result">
          <div className="lock">🔒</div>

          <h1>LOCKED</h1>

          <p>
            <strong>{winner}</strong> buzzed first
          </p>
        </div>
      )}
    </main>
  );
}

export default App;