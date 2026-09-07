/**
 * @typedef {"X" | "O" | null} CellValue
 * @typedef {"in-progress" | "X-wins" | "O-wins" | "draw"} GameStatus
 * @typedef {"X" | "O"} Player
 *
 * @typedef {Object} GameState
 * @property {CellValue[]} cells - Array of 9 cells representing the 3x3 board
 * @property {Player} currentPlayer - The player whose turn it is ("X" or "O")
 * @property {GameStatus} status - Current state of the game
 */

/**
 * All 8 winning lines on a 3x3 tic-tac-toe board:
 * 3 rows, 3 columns, and 2 diagonals.
 */
export const WINNING_LINES = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Checks if there is a winner given the current cells.
 *
 * @param {CellValue[]} cells
 * @returns {Player | null}
 */
function checkWinner(cells) {
  for (let i = 0; i < WINNING_LINES.length; i++) {
    const [a, b, c] = WINNING_LINES[i];
    const cellA = cells[a];
    if (cellA !== null && cellA === cells[b] && cellA === cells[c]) {
      return cellA;
    }
  }
  return null;
}

/**
 * Creates and returns a fresh game state.
 *
 * @returns {GameState} fresh state: { cells: Array(9).fill(null), currentPlayer: "X", status: "in-progress" }
 */
export function createGame() {
  return {
    cells: Array(9).fill(null),
    currentPlayer: "X",
    status: "in-progress",
  };
}

/**
 * Attempts to make a move at the specified cellIndex.
 * Returns a new GameState object with move applied if legal,
 * or returns the existing state unchanged if the move is illegal.
 *
 * @param {GameState} state
 * @param {number} cellIndex
 * @returns {GameState}
 */
export function makeMove(state, cellIndex) {
  // Validate state structure
  if (
    !state ||
    !Array.isArray(state.cells) ||
    state.cells.length !== 9 ||
    (state.currentPlayer !== "X" && state.currentPlayer !== "O")
  ) {
    return state;
  }

  // Illegal: game is already over
  if (state.status !== "in-progress") {
    return state;
  }

  // Illegal: invalid cell index
  if (
    typeof cellIndex !== "number" ||
    !Number.isInteger(cellIndex) ||
    cellIndex < 0 ||
    cellIndex > 8
  ) {
    return state;
  }

  // Illegal: cell is already occupied
  if (state.cells[cellIndex] !== null) {
    return state;
  }

  // Apply move immutably
  const nextCells = [...state.cells];
  nextCells[cellIndex] = state.currentPlayer;

  // Determine game status (win check takes precedence over draw check)
  const winner = checkWinner(nextCells);
  let nextStatus;
  if (winner === "X") {
    nextStatus = "X-wins";
  } else if (winner === "O") {
    nextStatus = "O-wins";
  } else if (!nextCells.includes(null)) {
    nextStatus = "draw";
  } else {
    nextStatus = "in-progress";
  }

  // Switch player
  const nextPlayer = state.currentPlayer === "X" ? "O" : "X";

  return {
    cells: nextCells,
    currentPlayer: nextPlayer,
    status: nextStatus,
  };
}

/**
 * Resets the game to the initial state.
 *
 * @returns {GameState}
 */
export function resetGame() {
  return createGame();
}

export default {
  createGame,
  makeMove,
  resetGame,
  WINNING_LINES,
};
