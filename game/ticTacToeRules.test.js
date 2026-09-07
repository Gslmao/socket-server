import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  makeMove,
  resetGame,
  WINNING_LINES,
} from "./ticTacToeRules.js";

test("createGame: initializes a fresh game state", () => {
  const game = createGame();
  assert.deepEqual(game, {
    cells: [null, null, null, null, null, null, null, null, null],
    currentPlayer: "X",
    status: "in-progress",
  });
  assert.equal(game.cells.length, 9);
  assert.ok(game.cells.every((cell) => cell === null));

  // Ensure fresh object on each invocation
  const game2 = createGame();
  assert.notEqual(game, game2);
  assert.notEqual(game.cells, game2.cells);
});

test("resetGame: returns a fresh initial state", () => {
  let game = createGame();
  game = makeMove(game, 0);
  game = makeMove(game, 1);

  const reset = resetGame();
  assert.deepEqual(reset, {
    cells: Array(9).fill(null),
    currentPlayer: "X",
    status: "in-progress",
  });
  assert.notEqual(game, reset);
});

test("makeMove: pure and immutable — does not mutate input state or cells", () => {
  const initial = createGame();
  Object.freeze(initial);
  Object.freeze(initial.cells);

  const afterFirstMove = makeMove(initial, 4);

  // Original state must be completely untouched
  assert.equal(initial.cells[4], null);
  assert.equal(initial.currentPlayer, "X");
  assert.equal(initial.status, "in-progress");

  // New state must have the move applied and player switched
  assert.notEqual(initial, afterFirstMove);
  assert.notEqual(initial.cells, afterFirstMove.cells);
  assert.equal(afterFirstMove.cells[4], "X");
  assert.equal(afterFirstMove.currentPlayer, "O");
  assert.equal(afterFirstMove.status, "in-progress");

  // Verify immutability of subsequent move
  Object.freeze(afterFirstMove);
  Object.freeze(afterFirstMove.cells);
  const afterSecondMove = makeMove(afterFirstMove, 0);

  assert.equal(afterFirstMove.cells[0], null);
  assert.equal(afterSecondMove.cells[0], "O");
  assert.equal(afterSecondMove.currentPlayer, "X");
  assert.equal(afterSecondMove.status, "in-progress");
});

test("Turn tracking: switches between X and O after each valid move", () => {
  let game = createGame();
  assert.equal(game.currentPlayer, "X");

  game = makeMove(game, 0); // X plays
  assert.equal(game.currentPlayer, "O");

  game = makeMove(game, 1); // O plays
  assert.equal(game.currentPlayer, "X");

  game = makeMove(game, 2); // X plays
  assert.equal(game.currentPlayer, "O");

  game = makeMove(game, 3); // O plays
  assert.equal(game.currentPlayer, "X");
});

test("Illegal moves: occupied cell is rejected and returns state unchanged", () => {
  let game = createGame();
  game = makeMove(game, 0); // X plays at 0
  assert.equal(game.cells[0], "X");
  assert.equal(game.currentPlayer, "O");

  // O tries to play at occupied cell 0
  const rejected = makeMove(game, 0);
  assert.equal(rejected, game, "Should return exact state reference unchanged");
  assert.equal(rejected.cells[0], "X");
  assert.equal(rejected.currentPlayer, "O");
  assert.equal(rejected.status, "in-progress");
});

test("Illegal moves: invalid indices rejected and return state unchanged", () => {
  const game = createGame();

  const invalidIndices = [-1, 9, 100, 1.5, NaN, "0", null, undefined, {}];
  for (const idx of invalidIndices) {
    const result = makeMove(game, idx);
    assert.equal(result, game, `Index ${idx} should be rejected`);
  }
});

test("Illegal moves: moves after game over (win) are rejected", () => {
  // X wins across top row: [0, 1, 2]
  let game = createGame();
  game = makeMove(game, 0); // X at 0
  game = makeMove(game, 3); // O at 3
  game = makeMove(game, 1); // X at 1
  game = makeMove(game, 4); // O at 4
  game = makeMove(game, 2); // X at 2 (X wins)

  assert.equal(game.status, "X-wins");

  // O attempts to move after game is over
  const attemptedMove = makeMove(game, 5);
  assert.equal(attemptedMove, game, "State should be returned unchanged after game over");
  assert.equal(attemptedMove.cells[5], null);
});

test("Illegal moves: moves after game over (draw) are rejected", () => {
  // Play to a draw
  const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
  let game = createGame();
  for (const idx of moves) {
    game = makeMove(game, idx);
  }
  assert.equal(game.status, "draw");

  const afterDrawMove = makeMove(game, 0);
  assert.equal(afterDrawMove, game);
});

test("Illegal moves: handles malformed state gracefully", () => {
  assert.equal(makeMove(null, 0), null);
  assert.equal(makeMove(undefined, 0), undefined);
  const badState1 = { cells: [1, 2], currentPlayer: "X", status: "in-progress" };
  assert.equal(makeMove(badState1, 0), badState1);
  const badState2 = { cells: Array(9).fill(null), currentPlayer: "Z", status: "in-progress" };
  assert.equal(makeMove(badState2, 0), badState2);
});

test("Win detection: all 8 winning lines detected for X", () => {
  assert.equal(WINNING_LINES.length, 8);

  for (const [a, b, c] of WINNING_LINES) {
    // Pick dummy cells for O that do not intersect with the winning line
    const nonLineCells = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
      (i) => i !== a && i !== b && i !== c
    );

    let game = createGame();
    game = makeMove(game, a); // X
    game = makeMove(game, nonLineCells[0]); // O
    game = makeMove(game, b); // X
    game = makeMove(game, nonLineCells[1]); // O
    game = makeMove(game, c); // X completes the line

    assert.equal(
      game.status,
      "X-wins",
      `Expected X-wins for winning line [${a}, ${b}, ${c}]`
    );
  }
});

test("Win detection: all 8 winning lines detected for O", () => {
  assert.equal(WINNING_LINES.length, 8);

  function formsAnyWinningLine(indices) {
    return WINNING_LINES.some(([a, b, c]) =>
      indices.includes(a) && indices.includes(b) && indices.includes(c)
    );
  }

  for (const [a, b, c] of WINNING_LINES) {
    const nonLineCells = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
      (i) => i !== a && i !== b && i !== c
    );

    // Find 3 non-line cells for X that do NOT form a winning line
    let xCells = null;
    for (let i = 0; i < nonLineCells.length; i++) {
      for (let j = i + 1; j < nonLineCells.length; j++) {
        for (let k = j + 1; k < nonLineCells.length; k++) {
          const candidate = [nonLineCells[i], nonLineCells[j], nonLineCells[k]];
          if (!formsAnyWinningLine(candidate)) {
            xCells = candidate;
            break;
          }
        }
        if (xCells) break;
      }
      if (xCells) break;
    }

    assert.ok(xCells, `Found non-winning moves for X while testing O win line [${a}, ${b}, ${c}]`);

    let game = createGame();
    game = makeMove(game, xCells[0]); // X
    game = makeMove(game, a);          // O
    game = makeMove(game, xCells[1]); // X
    game = makeMove(game, b);          // O
    game = makeMove(game, xCells[2]); // X
    game = makeMove(game, c);          // O completes the line

    assert.equal(
      game.status,
      "O-wins",
      `Expected O-wins for winning line [${a}, ${b}, ${c}]`
    );
  }
});

test("Draw detection: board fills with no winner", () => {
  // Sequence leading to draw:
  // X O X
  // X O O
  // O X X
  const moves = [
    { p: "X", i: 0 },
    { p: "O", i: 1 },
    { p: "X", i: 2 },
    { p: "O", i: 4 },
    { p: "X", i: 3 },
    { p: "O", i: 5 },
    { p: "X", i: 7 },
    { p: "O", i: 6 },
    { p: "X", i: 8 },
  ];

  let game = createGame();
  for (const move of moves) {
    assert.equal(game.currentPlayer, move.p);
    game = makeMove(game, move.i);
  }

  assert.equal(game.status, "draw");
  assert.ok(game.cells.every((c) => c !== null));
});

test("Win on 9th move (full board) is detected as win, NOT draw", () => {
  // Sequence:
  // Move 1 (X): 0
  // Move 2 (O): 2
  // Move 3 (X): 1
  // Move 4 (O): 3
  // Move 5 (X): 4
  // Move 6 (O): 5
  // Move 7 (X): 6
  // Move 8 (O): 7
  // Move 9 (X): 8 -> completes diagonal [0, 4, 8] on the 9th move!
  const sequence = [0, 2, 1, 3, 4, 5, 6, 7, 8];
  let game = createGame();
  for (const idx of sequence) {
    game = makeMove(game, idx);
  }
  assert.ok(game.cells.every((c) => c !== null));
  assert.equal(game.status, "X-wins");
});
