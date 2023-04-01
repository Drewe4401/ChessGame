import React, { useState, useEffect, useRef } from "react";
import Chessboard from "chessboardjsx";
import {Chess} from "chess.js";
import styles from './chessboard.module.css';
import io from "socket.io-client";


const socket = io("http://localhost:3001");

function ChessBoard() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState("start");
  const [playerColor, setPlayerColor] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log(`Connected with ID: ${socket.id}`);
    });
  
    socket.on("joinedRoom", ({ room, players }) => {
      console.log(`Joined room ${room} with players ${players.join(", ")}`);
      setPlayerColor(players.indexOf(socket.id) === 0 ? "white" : "black");
    });

    socket.on("start", () => {
      setFen("start");
      setGameStarted(true);
    });

    socket.on("gameOver", ({ result, winner }) => {
      if (result === "checkmate") {
        alert(`Checkmate! ${winner} wins.`);
      } else if (result === "stalemate") {
        alert("Stalemate! The game is a draw.");
      }
    });

    const updateGame = (sourceSquare, targetSquare) => {
      const newGame = new Chess(gameRef.current.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move !== null) {
        gameRef.current = newGame;
        setFen(newGame.fen());
      }

      if (gameRef.current.isCheckmate()) {
        socket.emit("gameOver", { winner: playerColor === "white" ? "black" : "white" });
      }
    };

    socket.on("move", ({ sourceSquare, targetSquare }) => {
      updateGame(sourceSquare, targetSquare);
    });

    //return () => {
    //  if (playerColor === null) {
    //    console.log("Disconnecting socket");
    //    socket.disconnect();
    //  }
  //  };
  }, [playerColor]); 


  const handleMove = ({ sourceSquare, targetSquare }) => {
    // Don't allow making a move if it's not the player's turn
    if (gameRef.current.turn() !== playerColor[0]) {
      return;
    }
  
    // Get legal moves for the source square
    const legalMoves = gameRef.current.moves({ square: sourceSquare, verbose: true });
  
    // Check if the target square is a legal move
    const isLegalMove = legalMoves.some(move => move.to === targetSquare);
  
    if (!isLegalMove) {
      alert("Illegal move! Please make a different move.");
      return;
    }
  
    // If the move is legal, make the move and update the game state
    gameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
  
    setFen(gameRef.current.fen());
    socket.emit("move", { sourceSquare, targetSquare });

    if (gameRef.current.isCheckmate()) {
      socket.emit("gameOver", { result: "checkmate", winner: playerColor });
      alert(`Checkmate! ${playerColor} wins.`);
    } else if (gameRef.current.isStalemate()) {
      socket.emit("gameOver", { result: "stalemate" });
      alert(`Stalemate! The game is a draw.`);
    }
  };

  return (
    <div className={styles.container}>
    {gameStarted && playerColor ? (
      <div className={styles.boardWrapper}>
        <h3 className={styles.status}>You are playing as {playerColor}</h3>
        <div className={styles.chessboard}>
          <Chessboard
            position={fen}
            onDrop={({ sourceSquare, targetSquare }) =>
              handleMove({ sourceSquare, targetSquare })
            }
            orientation={playerColor}
            draggable={!gameRef.current.game_over}
          />
        </div>
      </div>
    ) : (
      <h3 className={styles.status}>Waiting for opponent...</h3>
    )}
  </div>
);
}

export default ChessBoard;