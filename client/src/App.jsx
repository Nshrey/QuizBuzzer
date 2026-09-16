import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("https://quizbuzzerserver.onrender.com");
function Watermark() {
  return (
    <div className="watermark">
      Built by <strong>Shrey</strong>
      <span className="watermark-x">×</span>
      <strong>Nova</strong>
    </div>
  );
}

function App() {
  const isAdmin = window.location.pathname === "/admin";

  const [name, setName] = useState("");
  const [playerName, setPlayerName] = useState(
    sessionStorage.getItem("playerName") || ""
  );
  const [winner, setWinner] = useState(null);
  const [players, setPlayers] = useState([]);
  const [connected, setConnected] = useState(socket.connected);

  // -------------------------
  // SOCKET EVENTS
  // -------------------------

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onWinner = (winnerName) => setWinner(winnerName);
    const onReset = () => setWinner(null);
    const onPlayers = (playerList) => setPlayers(playerList);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("winner", onWinner);
    socket.on("reset", onReset);
    socket.on("players", onPlayers);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("winner", onWinner);
      socket.off("reset", onReset);
      socket.off("players", onPlayers);
    };
  }, []);

  // Admin registration
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

  // Player registration / reconnection
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

  // -------------------------
  // ACTIONS
  // -------------------------

  const join = (e) => {
    e.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) return;

    sessionStorage.setItem("playerName", cleanName);
    setPlayerName(cleanName);
  };

  const buzz = () => {
    if (!playerName || winner || !connected) return;

    if (navigator.vibrate) {
      navigator.vibrate(40);
    }

    socket.emit("buzz");
  };

  // -------------------------
  // ADMIN
  // -------------------------

  if (isAdmin) {
    return (
      <main className="page admin-page">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">F</div>

            <div>
              <strong>Fastest Finger</strong>
              <span>Quiz control</span>
            </div>
          </div>

          <div className={`connection ${connected ? "online" : "offline"}`}>
            <span />
            {connected ? "Live" : "Connecting"}
          </div>
        </header>

        <section className="admin-content">
          {!winner ? (
            <>
              <div className="admin-heading">
                <span className="soft-label">ROUND READY</span>

                <h1>Ready for the next question?</h1>

                <p>
                  Everyone is connected. The first buzz will appear here.
                </p>
              </div>

              <div className="players-card">
                <div className="card-heading">
                  <div>
                    <span className="soft-label">PLAYERS</span>
                    <h2>Connected players</h2>
                  </div>

                  <div className="count-badge">
                    {players.length}
                  </div>
                </div>

                <div className="player-list">
                  {players.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">○</div>
                      <p>Waiting for players to join</p>
                    </div>
                  ) : (
                    players.map((player, index) => (
                      <div className="admin-player" key={`${player}-${index}`}>
                        <div className="player-avatar">
                          {player.charAt(0).toUpperCase()}
                        </div>

                        <div className="player-details">
                          <strong>{player}</strong>
                          <span>Ready to buzz</span>
                        </div>

                        <div className="ready-pill">
                          <span />
                          Ready
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="waiting-card">
                <div className="waiting-pulse">
                  <span />
                </div>

                <div>
                  <strong>Listening for a buzz</strong>
                  <p>The round will lock automatically.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="winner-screen">
              <div className="winner-symbol">✓</div>

              <span className="soft-label">FIRST BUZZ</span>

              <h1>{winner}</h1>

              <p>was first on the buzzer</p>

              <button
                className="next-round"
                onClick={() => socket.emit("reset")}
              >
                Next round
                <span>→</span>
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  // -------------------------
  // JOIN
  // -------------------------

  if (!playerName) {
    return (
      <main className="page join-page">
        <div className="decor decor-one" />
        <div className="decor decor-two" />

        <section className="join-card">
          <div className="join-logo">F</div>

          <span className="soft-label">FASTEST FINGER</span>

          <h1>Ready to play?</h1>

          <p className="join-description">
            Enter your name and get ready for the next question.
          </p>

          <form onSubmit={join}>
            <label htmlFor="player-name">Your name</label>

            <input
              id="player-name"
              autoFocus
              autoComplete="off"
              placeholder="e.g. Shrey"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button type="submit">
              Join game
              <span>→</span>
            </button>
          </form>

          <div className={`join-status ${connected ? "" : "disconnected"}`}>
            <span />
            {connected ? "Game server connected" : "Connecting to game server"}
          </div>
        </section>
      </main>
    );
  }

  // -------------------------
  // PLAYER
  // -------------------------

  return (
    <main className={`page player-page ${winner ? "round-locked" : ""}`}>
      <header className="player-header">
        <div className="mini-brand">
          <div>F</div>
          <span>Fastest Finger</span>
        </div>

        <div className="player-identity">
          <span>Playing as</span>
          <strong>{playerName}</strong>
        </div>
      </header>

      {!winner ? (
        <section className="buzzer-area">
          <div className="player-greeting">
            <span className="soft-label">ROUND READY</span>
            <h1>Know the answer?</h1>
            <p>Be the first to hit the buzzer.</p>
          </div>

          <div className="buzzer-shell">
            <div className="buzzer-ring">
              <button
                className="buzz-button"
                onClick={buzz}
                disabled={!connected}
              >
                <span>BUZZ</span>
              </button>
            </div>
          </div>

          <div className={`armed-status ${connected ? "" : "disconnected"}`}>
            <span />
            {connected ? "Ready to buzz" : "Reconnecting…"}
          </div>

          <p className="buzzer-hint">
            Tap once when you know the answer
          </p>
        </section>
      ) : (
        <section className="locked-screen">
          <div className="received-icon">
            <span>✓</span>
          </div>

          <span className="soft-label">BUZZ RECEIVED</span>

          <h1>Round locked</h1>

          <p>
            The quizmaster has the result.
            <br />
            Hang tight for the next question.
          </p>

          <div className="waiting-host">
            <span className="dot dot-one" />
            <span className="dot dot-two" />
            <span className="dot dot-three" />

            Waiting for quizmaster
          </div>
        </section>
      )}
        <Watermark />
    </main>
  );
}

export default App;