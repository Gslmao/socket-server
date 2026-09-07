/**
 * Interactive / Console script demonstrating standalone tic-tac-toe rules engine.
 * Run with: node game/demo.js
 */

import { createGame, makeMove, resetGame } from "./ticTacToeRules.js";

function renderBoard(cells) {
  const display = cells.map((val, idx) => (val === null ? String(idx) : val));
  return [
    ` ${display[0]} | ${display[1]} | ${display[2]} `,
    "---+---+---",
    ` ${display[3]} | ${display[4]} | ${display[5]} `,
    "---+---+---",
    ` ${display[6]} | ${display[7]} | ${display[8]} `,
  ].join("\n");
}

console.log("=== Tic-Tac-Toe Rules Engine Demo ===\n");

console.log("1. Starting new game:");
let state = createGame();
console.log(renderBoard(state.cells));
console.log(`Current player: ${state.currentPlayer}, Status: ${state.status}\n`);

console.log("2. Simulating gameplay leading to X victory via row [0, 1, 2]:");
const moves = [0, 3, 1, 4, 2];

for (const cellIndex of moves) {
  const player = state.currentPlayer;
  state = makeMove(state, cellIndex);
  console.log(`Player ${player} plays cell ${cellIndex}:`);
  console.log(renderBoard(state.cells));
  console.log(`Status: ${state.status}, Next player: ${state.currentPlayer}\n`);
}

console.log("3. Attempting illegal move after game over (should be rejected):");
const unchangedState = makeMove(state, 5);
console.log(`State unchanged? ${unchangedState === state}\n`);

console.log("4. Resetting game:");
state = resetGame();
console.log(renderBoard(state.cells));
console.log(`Current player: ${state.currentPlayer}, Status: ${state.status}\n`);
