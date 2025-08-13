// ===== Constants & DOM Elements =====
const R = 4, C = 3;

const boardEl = document.getElementById('board');
const turnText = document.getElementById('turnText');
const selText = document.getElementById('selText');
const prisonEls = [document.getElementById('prison0'), document.getElementById('prison1')];
const logEl = document.getElementById('log');
const undoBtn = document.getElementById('undoBtn');
const flipBtn = document.getElementById('flipBtn');

const btnHvh = document.getElementById('btnHvh');
const btnHva = document.getElementById('btnHva');

const btnAi0 = document.getElementById('btnAi0');
const btnAi1 = document.getElementById('btnAi1');
const btnAiNone = document.getElementById('btnAiNone');

const resetBtn = document.getElementById('resetBtn');

// for AI move selection
const pieceValues = {
  king: 1000,
  rook: 10,
  bishop: 8,
  queen: 5,
  pawn: 3,
};

// ===== Game State Variables =====
let state = null;
let boardFlipped = false;
let gameMode = 'hvh'; // 'hvh' or 'hva'
let aiPlayer = null;  // null, 0, or 1

// ===== Initialization =====
function initState() {
  const grid = Array.from({ length: R }, () => Array(C).fill(null));

  // Player Green
  grid[0][0] = { type: 'rook', owner: 1 };
  grid[0][1] = { type: 'king', owner: 1 };
  grid[0][2] = { type: 'bishop', owner: 1 };
  grid[1][1] = { type: 'pawn', owner: 1 };

  // Player Red
  grid[3][0] = { type: 'bishop', owner: 0 };
  grid[3][1] = { type: 'king', owner: 0 };
  grid[3][2] = { type: 'rook', owner: 0 };
  grid[2][1] = { type: 'pawn', owner: 0 };

  state = {
    grid,
    turn: 0,
    selected: null,
    prisoners: [[], []],
    kingInEnemyRowCountdown: [null, null],
    pendingDeploy: null,
    gameOver: false,
  };

  logEl.innerHTML = 'The game begins.';
  updateModeUI();
  updateAIUI();
  render();

  if (gameMode === 'hva' && state.turn === aiPlayer) {
    setTimeout(() => aiMove(5), 300);
  }
}

// ===== UI Update Functions =====
function updateModeUI() {
  btnHvh.classList.toggle('active', gameMode === 'hvh');
  btnHva.classList.toggle('active', gameMode === 'hva');
}

function updateAIUI() {
  btnAi0.classList.toggle('active', aiPlayer === 0);
  btnAi1.classList.toggle('active', aiPlayer === 1);
  btnAiNone.classList.toggle('active', aiPlayer === null);
}

// Flip Board
function updateFlip() {
  boardEl.style.transform = boardFlipped ? 'rotate(180deg)' : '';
}

// Side Panel
function updateHUD() {
  turnText.textContent = state.turn === 0 ? 'Red' : 'Green';

  if (state.selected) {
    const p = state.grid[state.selected.r][state.selected.c];
    selText.innerHTML = `(${state.selected.r},${state.selected.c}) ${pieceLabel(p)}`;
  } else {
    selText.textContent = 'Nothing';
  }

  prisonEls.forEach((el, i) => {
    el.innerHTML = '';
    state.prisoners[i].forEach((type, idx) => {
      const prisonerDiv = document.createElement('div');
      prisonerDiv.className = 'prisoner';
      prisonerDiv.innerHTML = pieceLabel({ type });
      prisonerDiv.title = `${type}`;
      prisonerDiv.addEventListener('click', () => deployPrisoner(i, idx));
      el.appendChild(prisonerDiv);
    });
  });
}

function pieceLabel(p) {
  const map = {
    rook: '<i class="fa-solid fa-chess-rook"></i>',
    bishop: '<i class="fa-solid fa-chess-bishop"></i>',
    king: '<i class="fa-solid fa-chess-king"></i>',
    pawn: '<i class="fa-solid fa-chess-pawn"></i>',
    queen: '<i class="fa-solid fa-chess-queen"></i>',
  };
  return map[p.type] || p.type;
}

function log(msg) {
  const p = document.createElement('div');
  p.innerHTML = msg;
  logEl.prepend(p);
}

// ===== Board Rendering =====
function render() {
  boardEl.innerHTML = '';

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (r === 0) cell.classList.add('territory', 'green');
      if (r === R - 1) cell.classList.add('territory', 'red');

      cell.dataset.r = r;
      cell.dataset.c = c;

      const piece = state.grid[r][c];
      if (piece) {
        cell.classList.add('occupied');
        const elm = document.createElement('div');
        elm.className = `piece player${piece.owner}`;
        elm.innerHTML = pieceLabel(piece);
        elm.title = (piece.owner === 0 ? 'Red' : 'Green') + ' ' + piece.type;
        addPieceDots(elm, piece.type);
        cell.appendChild(elm);
      }

      // Highlighting selected and valid moves
      if (state.selected && state.selected.r === r && state.selected.c === c) {
        cell.classList.add('selected');
      }

      if (
        state.selected &&
        canMove(
          state.grid[state.selected.r][state.selected.c],
          state.selected.r,
          state.selected.c,
          r,
          c
        )
      ) {
        cell.classList.add('valid');
      }

      // Highlight valid deploy cells during deployment
      if (state.pendingDeploy) {
        clearHighlights();
        const owner = state.pendingDeploy.owner;
        const oppTerrRow = owner === 0 ? 0 : R - 1;
        if (!state.grid[r][c] && r !== oppTerrRow) {
          cell.classList.add('deploy-valid');
        }
      }

      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  updateHUD();
}

// Remove cell highlights
function clearHighlights() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.remove('valid', 'selected');
  });
}

// Dots for showing where each piece can go
function addPieceDots(elm, type) {
  const dotPositions = {
    rook: ['side-top', 'side-bottom', 'side-left', 'side-right'],
    bishop: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    king: [
      'side-top', 'side-bottom', 'side-left', 'side-right',
      'top-left', 'top-right', 'bottom-left', 'bottom-right',
    ],
    pawn: ['side-top'],
    queen: ['side-top', 'side-left', 'side-right', 'side-bottom', 'top-left', 'top-right'],
  };

  (dotPositions[type] || []).forEach(pos => {
    const dot = document.createElement('span');
    dot.className = `dot ${pos}`;
    elm.appendChild(dot);
  });
}

// ===== Event Handlers =====
function onCellClick(r, c) {
  if (state.gameOver) return;
  if (state.pendingDeploy) return;
  if (gameMode === 'hva' && state.turn === aiPlayer) return;

  const clickedPiece = state.grid[r][c];

  if (state.selected) {
    const from = state.selected;
    const selectedPiece = state.grid[from.r][from.c];

    if (from.r === r && from.c === c) {
      // Deselect
      state.selected = null;
      render();
      return;
    }

    if (selectedPiece && selectedPiece.owner === state.turn) {
      if (canMove(selectedPiece, from.r, from.c, r, c)) {
        makeMove(from.r, from.c, r, c);
        return;
      }
    }

    if (clickedPiece && clickedPiece.owner === state.turn) {
      state.selected = { r, c };
      render();
      return;
    }

    // Invalid selection reset
    state.selected = null;
    render();
    return;
  }

  if (clickedPiece && clickedPiece.owner === state.turn) {
    state.selected = { r, c };
    render();
  }
}

undoBtn.addEventListener('click', () => {
  if (state.pendingDeploy) {
    state.pendingDeploy = null;
  }
  state.selected = null;
  render();
});

flipBtn.addEventListener('click', () => {
  boardFlipped = !boardFlipped;
  updateFlip();
});

// Mode buttons
btnHvh.addEventListener('click', () => {
  gameMode = 'hvh';
  aiPlayer = null;
  updateModeUI();
  updateAIUI();
  initState();
});

btnHva.addEventListener('click', () => {
  if (aiPlayer === null) aiPlayer = 1; // default AI side
  gameMode = 'hva';
  updateModeUI();
  updateAIUI();
  initState();
});

// AI side buttons
btnAi0.addEventListener('click', () => {
  aiPlayer = 0;
  if (gameMode !== 'hva') {
    gameMode = 'hva';
    updateModeUI();
  }
  updateAIUI();
  initState();
});

btnAi1.addEventListener('click', () => {
  aiPlayer = 1;
  if (gameMode !== 'hva') {
    gameMode = 'hva';
    updateModeUI();
  }
  updateAIUI();
  initState();
});

btnAiNone.addEventListener('click', () => {
  aiPlayer = null;
  if (gameMode === 'hva') {
    gameMode = 'hvh';
    updateModeUI();
  }
  updateAIUI();
  initState();
});

resetBtn.addEventListener('click', () => {
  if (confirm('Would you like to start a new game?')) initState();
});

// ===== Game Logic =====
function canMove(piece, fr, fc, tr, tc) {
  if (state.gameOver) return false;
  if (tr < 0 || tr >= R || tc < 0 || tc >= C) return false;

  const dest = state.grid[tr][tc];
  if (dest && dest.owner === piece.owner) return false;

  const dr = tr - fr, dc = tc - fc;
  const forward = piece.owner === 0 ? -1 : 1;
  const oneStep = Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0);
  if (!oneStep) return false;

  switch (piece.type) {
    case 'rook':
      return (Math.abs(dr) + Math.abs(dc) === 1);
    case 'bishop':
      return (Math.abs(dr) === 1 && Math.abs(dc) === 1);
    case 'king':
      return true;
    case 'pawn':
      return (dr === forward && dc === 0);
    case 'queen': {
      const diagonalBack = piece.owner === 0
        ? (dr === 1 && Math.abs(dc) === 1)
        : (dr === -1 && Math.abs(dc) === 1);
      if (diagonalBack) return false;
      return true;
    }
  }
  return false;
}

function makeMove(fr, fc, tr, tc) {
  if (state.gameOver) return;

  const mover = state.grid[fr][fc];
  const captured = state.grid[tr][tc];

  state.grid[tr][tc] = mover;
  state.grid[fr][fc] = null;

  if (captured && captured.type === 'king') {
    alert(`${mover.owner === 0 ? 'Red' : 'Green'} wins! Captured the king.`);
    log(`<b style="color: #ff3300;">Game over: King captured.</b>`);
    log(`<b style="color: ${mover.owner === 0 ? '#b42418' : '#0d7441'};">${mover.owner === 0 ? 'Red' : 'Green'} wins!</b>`);
    state.gameOver = true;
  }

  if (captured) {
    let newType = captured.type === 'queen' ? 'pawn' : captured.type;
    state.prisoners[state.turn].push(newType);
    log(`${state.turn === 0 ? 'Red' : 'Green'} captured ${pieceLabel(captured)}.`);
  }

  if (mover.type === 'pawn') {
    const enemyTerrRow = mover.owner === 0 ? 0 : R - 1;
    if (tr === enemyTerrRow) {
      mover.type = 'queen';
      log(`${state.turn === 0 ? 'Red' : 'Green'}'s <i class="fa-solid fa-chess-pawn"></i> promoted to <i class="fa-solid fa-chess-queen"></i>.`);
    }
  }

  checkKingInEnemyAfterMove(mover, tr, tc);

  state.turn = 1 - state.turn;
  state.selected = null;

  checkKingPromotionWin();
  render();

  if (!state.gameOver && gameMode === 'hva' && state.turn === aiPlayer) {
    setTimeout(() => aiMove(5), 300);
  }
}

function checkKingInEnemyAfterMove(mover, tr, tc) {
  if (mover.type === 'king') {
    const enemyTerrRow = mover.owner === 0 ? 0 : R - 1;
    if (tr === enemyTerrRow) {
      state.kingInEnemyRowCountdown[mover.owner] = true;
      log(`<b>${mover.owner === 0 ? 'Red' : 'Green'}'s king entered enemy territory.</b>`);
      return;
    }
  }
  for (let p = 0; p < 2; p++) {
    const pos = findKingPos(p);
    if (!pos) state.kingInEnemyRowCountdown[p] = null;
    else {
      const enemyTerrRow = p === 0 ? 0 : R - 1;
      if (pos.r !== enemyTerrRow) state.kingInEnemyRowCountdown[p] = null;
    }
  }
}

function findKingPos(owner) {
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const p = state.grid[r][c];
      if (p && p.owner === owner && p.type === 'king') return { r, c };
    }
  }
  return null;
}

function checkKingPromotionWin() {
  const p = state.turn;
  if (state.kingInEnemyRowCountdown[p] === true) {
    alert(`${p === 0 ? 'Red' : 'Green'} wins! King survived in enemy territory for one turn.`);
    log(`<b style="color: #ff3300;">Game over: King survived in enemy territory.`);
    log(`<b style="color: ${p === 0 ? '#b42418' : '#0d7441'};">${p === 0 ? 'Red' : 'Green'} wins!</b>`);
    state.gameOver = true;
  }
}

// ===== Deployment Logic =====
function deployPrisoner(owner, index) {
  if (state.gameOver) return;
  if (owner !== state.turn) {
    // alert("Invalid piece selected.");
    return;
  }

  // If a deployment is already pending, cancel it first
  if (state.pendingDeploy) {
    // Remove previous click handler & undo handler
    document.removeEventListener('click', state.pendingDeploy.handler, true);
    undoBtn.removeEventListener('click', state.pendingDeploy.undoHandler);

    // Remove highlight from previously selected prisoner
    document.querySelectorAll('.prisoner.deploying').forEach(el => el.classList.remove('deploying'));

    // Clear pendingDeploy before starting new one
    state.pendingDeploy = null;
  }

  const type = state.prisoners[owner][index];
  state.pendingDeploy = { owner, index, type };

  render();

  // Highlight only the selected prisoner div
  document.querySelectorAll('.prisoner.deploying').forEach(el => el.classList.remove('deploying'));
  const prisonDivs = prisonEls[owner].querySelectorAll('.prisoner');
  if (prisonDivs[index]) {
    prisonDivs[index].classList.add('deploying');
  }

  const handler = (ev) => {
    const cell = ev.target.closest('.cell');
    if (!cell) return;
    const r = +cell.dataset.r;
    const c = +cell.dataset.c;

    if (state.grid[r][c]) {
      alert('A piece is already here.');
      return;
    }
    const oppTerrRow = owner === 0 ? 0 : R - 1;
    if (r === oppTerrRow) {
      alert("Cannot deploy in opponent's territory.");
      return;
    }

    state.grid[r][c] = { type, owner };
    state.prisoners[owner].splice(index, 1);
    state.pendingDeploy = null;

    document.removeEventListener('click', handler, true);
    undoBtn.removeEventListener('click', undoHandler);

    document.querySelectorAll('.prisoner.deploying').forEach(el => el.classList.remove('deploying'));

    log(`${owner === 0 ? 'Red' : 'Green'} deployed captured piece ${pieceLabel({ type })}.`);

    state.turn = 1 - state.turn;
    render();

    if (!state.gameOver && gameMode === 'hva' && state.turn === aiPlayer) {
      setTimeout(() => aiMove(5), 300);
    }
  };

  const undoHandler = () => {
    state.pendingDeploy = null;

    document.removeEventListener('click', handler, true);
    undoBtn.removeEventListener('click', undoHandler);

    document.querySelectorAll('.prisoner.deploying').forEach(el => el.classList.remove('deploying'));

    render();
  };

  // Save handlers so we can remove them if canceled next time
  state.pendingDeploy.handler = handler;
  state.pendingDeploy.undoHandler = undoHandler;

  undoBtn.addEventListener('click', undoHandler);
  document.addEventListener('click', handler, true);
}

// ===== AI Logic =====
// Creates a deep copy of the game state.
function copyState(s) {
  return {
    grid: s.grid.map(row => row.map(p => p ? { ...p } : null)),
    turn: s.turn,
    selected: s.selected ? { ...s.selected } : null,
    prisoners: [s.prisoners[0].slice(), s.prisoners[1].slice()],
    kingInEnemyRowCountdown: s.kingInEnemyRowCountdown.slice(),
    pendingDeploy: null,
    gameOver: s.gameOver,
  };
}

function updateKingEnemyTerritoryCounter(s) {
  for (let player = 0; player <= 1; player++) {
    const kingPos = findKingPosForState(s, player);
    if (!kingPos) {
      s.kingInEnemyRowCountdown[player] = null;
      continue;
    }
    const enemyTerrRow = (player === 0) ? 0 : R - 1;
    if (kingPos.r === enemyTerrRow) {
      if (s.kingInEnemyRowCountdown[player] === null) {
        s.kingInEnemyRowCountdown[player] = 1;
      } else {
        s.kingInEnemyRowCountdown[player]++;
      }
    } else {
      s.kingInEnemyRowCountdown[player] = null;
    }
  }
}

// Returns a numeric score for the board from the player’s perspective.
function evaluateBoard(s, player) {
  if (s.gameOver) {
    const aiKing = findKingPosForState(s, player);
    const oppKing = findKingPosForState(s, 1 - player);
    if (!aiKing) return -Infinity;
    if (!oppKing) return Infinity;
  }

  let score = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const p = s.grid[r][c];
      if (p) {
        const val = pieceValues[p.type] || 0;
        score += (p.owner === player) ? val : -val;
      }
    }
  }

  // King is in territory
  const myKingCount = s.kingInEnemyRowCountdown[player];
  if (myKingCount !== null && myKingCount > 0) {
    score += 100 * myKingCount;
  }

  // opp King is in territory
  const oppKingCount = s.kingInEnemyRowCountdown[1 - player];
  if (oppKingCount !== null && oppKingCount > 0) {
    score -= 100 * oppKingCount;
  }

  return score;
}

// Finds the coordinates of a given player's king.
function findKingPosForState(s, owner) {
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const p = s.grid[r][c];
      if (p && p.owner === owner && p.type === 'king') return { r, c };
    }
  }
  return null;
}

// Generates all possible legal moves for the current turn (Normal moves & Deploy).
function generateMoves(s) {
  const moves = [];

  // Normal moves
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const p = s.grid[r][c];
      if (p && p.owner === s.turn) {
        for (let tr = 0; tr < R; tr++) {
          for (let tc = 0; tc < C; tc++) {
            if (canMoveForState(s, p, r, c, tr, tc)) {
              moves.push({ type: 'move', from: { r, c }, to: { r: tr, c: tc } });
            }
          }
        }
      }
    }
  }

  // Deploy moves
  if (s.prisoners[s.turn].length > 0) {
    s.prisoners[s.turn].forEach((type, idx) => {
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (!s.grid[r][c]) {
            const oppTerrRow = s.turn === 0 ? 0 : R - 1;
            if (r !== oppTerrRow) {
              moves.push({ type: 'deploy', prisonerIndex: idx, pos: { r, c } });
            }
          }
        }
      }
    });
  }

  return moves;
}

// Check move is valid for the given piece.
function canMoveForState(s, piece, fr, fc, tr, tc) {
  if (tr < 0 || tr >= R || tc < 0 || tc >= C) return false;
  const dest = s.grid[tr][tc];
  if (dest && dest.owner === piece.owner) return false;

  const dr = tr - fr, dc = tc - fc;
  const forward = (piece.owner === 0) ? -1 : 1;
  const oneStep = Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0);
  if (!oneStep) return false;

  switch (piece.type) {
    case 'rook': return (Math.abs(dr) + Math.abs(dc) === 1);
    case 'bishop': return (Math.abs(dr) === 1 && Math.abs(dc) === 1);
    case 'king': return true;
    case 'pawn': return (dr === forward && dc === 0);
    case 'queen': {
      const diagonalBack = (piece.owner === 0) ? (dr === 1 && Math.abs(dc) === 1) : (dr === -1 && Math.abs(dc) === 1);
      if (diagonalBack) return false;
      return true;
    }
  }
  return false;
}

// Applies a move to a copied state and returns the updated state.
function applyMove(s, move) {
  const ns = copyState(s);
  if (move.type === 'move') {
    const p = ns.grid[move.from.r][move.from.c];
    const captured = ns.grid[move.to.r][move.to.c];

    ns.grid[move.to.r][move.to.c] = p;
    ns.grid[move.from.r][move.from.c] = null;

    if (captured) {
      let newType = captured.type;
      if (captured.type === 'queen') newType = 'pawn';
      ns.prisoners[ns.turn].push(newType);
    }

    if (p.type === 'pawn') {
      const enemyTerrRow = (p.owner === 0) ? 0 : R - 1;
      if (move.to.r === enemyTerrRow) {
        ns.grid[move.to.r][move.to.c].type = 'queen';
      }
    }
  } else if (move.type === 'deploy') {
    const prisonerType = ns.prisoners[ns.turn][move.prisonerIndex];
    ns.grid[move.pos.r][move.pos.c] = { type: prisonerType, owner: ns.turn };
    ns.prisoners[ns.turn].splice(move.prisonerIndex, 1);
  }

  updateKingEnemyTerritoryCounter(ns);

  ns.turn = 1 - ns.turn;
  return ns;
}

// Top-level AI move executor
function aiMove(depth) {
  if (state.gameOver) return;

  let best = minimax(state, depth, -Infinity, Infinity, true, aiPlayer);

  // If minimax finds nothing, pick the first legal move
  if (!best.move) {
    const legalMoves = getAllLegalMoves(aiPlayer);
    if (legalMoves.length > 0) {
      best = { move: legalMoves[0] }; // guaranteed move
    } else {
      log("AI has no legal moves — skipping turn.");
      return;
    }
  }

  if (best.move.type === 'move') {
    makeMove(best.move.from.r, best.move.from.c, best.move.to.r, best.move.to.c);
  } else if (best.move.type === 'deploy') {
    const { prisonerIndex, pos } = best.move;
    const deployedType = state.prisoners[state.turn][prisonerIndex];
    
    state.grid[pos.r][pos.c] = { type: deployedType, owner: state.turn };
    state.prisoners[state.turn].splice(prisonerIndex, 1);

    // Reset selection state so no piece stays selected
    state.selected = null;
    
    clearHighlights();

    log(`${state.turn === 0 ? 'Red' : 'Green'} deployed captured piece ${pieceLabel({ type: deployedType })}.`);
    
    state.turn = 1 - state.turn;
    render();

    if (!state.gameOver && gameMode === 'hva' && state.turn === aiPlayer) {
      setTimeout(() => aiMove(5), 300);
    }
  }
}

// Returns all legal moves for a given player in the current state.
function getAllLegalMoves(player) {
  let moves = [];

  // Normal piece moves
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const piece = state.grid[r][c];
      if (piece && piece.owner === player) {
        const pieceMoves = getMovesForPiece(r, c, state.grid);
        pieceMoves.forEach(m => {
          moves.push({ type: 'move', from: { r, c }, to: m });
        });
      }
    }
  }

  // Prisoner deployment
  if (state.prisoners[player] && state.prisoners[player].length > 0) {
    for (let i = 0; i < state.prisoners[player].length; i++) {
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (!state.grid[r][c]) {
            const oppTerrRow = player === 0 ? 0 : R - 1;
            if (r !== oppTerrRow) {
              moves.push({ type: 'deploy', prisonerIndex: i, pos: { r, c } });
            }
          }
        }
      }
    }
  }

  return moves;
}

// Returns all legal destinations for a piece.
function getMovesForPiece(r, c, grid) {
  const moves = [];
  const piece = grid[r][c];
  if (!piece) return moves;

  // Same movement logic as canMove()
  for (let tr = 0; tr < R; tr++) {
    for (let tc = 0; tc < C; tc++) {
      if (tr === r && tc === c) continue;
      if (canMove(piece, r, c, tr, tc)) {
        moves.push({ r: tr, c: tc });
      }
    }
  }
  return moves;
}

// Implements minimax search with alpha–beta pruning. Searches possible move sequences up to depth.
function minimax(s, depth, alpha, beta, maximizingPlayer, player) {
  if (depth === 0 || s.gameOver) {
    return { score: evaluateBoard(s, player) };
  }

  const moves = generateMoves(s);

  if (moves.length === 0) {
    // No moves, lose condition
    return { score: maximizingPlayer ? -Infinity : Infinity };
  }

  // Choose move that captures king
  for (const move of moves) {
    if (move.type === 'move') {
      const targetPiece = s.grid[move.to.r][move.to.c];
      if (targetPiece && targetPiece.type === 'king' && targetPiece.owner !== s.turn) {
        // Win directly = Inf score
        return { score: maximizingPlayer ? Infinity : -Infinity, move };
      }
    }
    else if (move.type === 'deploy') {
      // Deploy cannot attack king directly
    }
  }

  let bestMove = null;

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const ns = applyMove(s, move);
      ns.gameOver = checkGameOver(ns);
      const eval = minimax(ns, depth - 1, alpha, beta, false, player).score;
      if (eval > maxEval) {
        maxEval = eval;
        bestMove = move;
      }
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const ns = applyMove(s, move);
      ns.gameOver = checkGameOver(ns);
      const eval = minimax(ns, depth - 1, alpha, beta, true, player).score;
      if (eval < minEval) {
        minEval = eval;
        bestMove = move;
      }
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// Check Game Over conditions.
function checkGameOver(s) {
  const kings = [findKingPosForState(s, 0), findKingPosForState(s, 1)];
  if (!kings[0] || !kings[1]) return true;

  for (let player = 0; player <= 1; player++) {
    if (s.kingInEnemyRowCountdown[player] !== null && s.kingInEnemyRowCountdown[player] >= 2) {
      return true;
    }
  }

  return false;
}

// ===== Start Game =====
initState();
updateFlip();