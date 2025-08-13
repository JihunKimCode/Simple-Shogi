# [Simple-Shogi](https://jihunkimcode.github.io/Simple-Shogi/)
Simplified version of Shogi.

## Introduction
Simple Shogi is a compact board game inspired by Dōbutsu Shōgi, a small-scale variant of traditional shogi. To learn more about Dōbutsu Shōgi, you can visit its [Wikipedia page](https://en.wikipedia.org/wiki/D%C5%8Dbutsu_sh%C5%8Dgi).

## Rules
1. Simple Shogi is played on a 4×3 board (12 squares). Each player’s side is divided into three rows, known as their territory.
2. Each piece moves only in the direction indicated on its symbol. Starting positions are fixed:

    * **King** – Placed in the center of your back row. Moves one square in any direction.

    * **Rook** – Placed to the right of the King. Moves any number of squares forward, backward, left, or right.

    * **Bishop** – Placed to the left of the King. Moves any number of squares diagonally.

    * **Pawn** – Placed directly in front of the King. Moves one square forward. Upon entering the opponent’s territory, it is flipped and promoted to a Queen.

    * **Queen** – Moves in any direction except diagonally backward.

3. Players alternate turns, moving one piece at a time.
4. Capturing and Deploying Pieces
    * When you move a piece onto a square occupied by an opponent’s piece, that piece is captured.
    * Captured pieces become part of your reserve and can be redeployed as your piece starting from your next turn.
    * Placing a captured piece on the board counts as your turn, and pieces cannot be placed on a spot where pieces are already placed or on the opponent's territory.
    * A captured Queen must be flipped back to a Pawn before being redeployed.
6. Pieces cannot rotate to change their movement direction.
7. A player wins by either:
    * Capturing the opponent’s King.
    * Moving their own King into the opponent’s territory and keeping it there until the start of their next turn.

## How to Play
* Click a button to select the game mode or choose the AI player’s side.

  * Changing the game mode or AI side will reset the game.

* Click on a piece to see its possible moves.

* To deploy captured pieces, click on them; click “Cancel” to deselect.

* Use the “Flip Board” button to rotate the board view.

* Click “Reset” to start a new game.

## Play with AI
### How AI chooses a move
1. Apply the move to a copy of the state.

2. Check if game over (e.g., king captured or king held territory).

3. Evaluate the new board state using `evaluateBoard`.

4. Recursively call `minimax` for the opponent’s best response. If any move captures the opponent’s king, minimax returns an Infinity score immediately.

5. Use **alpha-beta pruning** to cut off branches that won’t improve the AI’s outcome.

6. AI executes the chosen move (move or deploy).

### Core Functions
* `copyState`: Creates a deep copy of the game state.
* `evaluateBoard`: Returns a numeric score for the board from the player’s perspective.
* `findKingPosForState`: Finds the coordinates of a given player's king.
* `generateMoves`: Generates all possible legal moves for the current turn (Normal moves & Deploy).
* `canMoveForState`: Check move is valid for the given piece.
* `applyMove`: Applies a move to a copied state and returns the updated state.

### Decision-Making Functions
* `aiMove`: Top-level AI move executor. Calls `minimax` to select the best move. If no move is found, it defaults to the first legal move.
* `getAllLegalMoves`: Returns all legal moves for a given player in the current state.
* `getMovesForPiece`: Returns all legal destinations for a piece.
* `minimax`: Implements minimax search with alpha–beta pruning. Searches possible move sequences up to **depth**.
* `checkGameOver`: Check Game Over conditions.
