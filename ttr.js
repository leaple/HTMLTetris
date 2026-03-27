const rows = 20, cols = 10;
let boardState = Array.from({ length: rows }, () => Array(cols).fill(null));

let currentBlock = null, position = { x: 4, y: 0 };
let holdBlock = null, nextBlock = null;
let canHold = true;

let dropInterval = 500, dropTimer = null;
const keyPressed = {};

let score = 0, level = 1, linesClearedTotal = 0, backToBack = false;

const board = document.getElementById("board");
const cells = [];

// 보드 생성
for (let i = 0; i < rows * cols; i++) {
  const cell = document.createElement("div");
  board.appendChild(cell);
  cells.push(cell);
}

// 테트로미노
const tetrominoes = [
  { shape: [[1, 1, 1, 1]], color: "cyan" },   // I
  { shape: [[1, 1], [1, 1]], color: "yellow" }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: "purple" }, // T
  { shape: [[1, 1, 0], [0, 1, 1]], color: "green" }, // S
  { shape: [[0, 1, 1], [1, 1, 0]], color: "red" }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: "orange" }, // L
  { shape: [[0, 0, 1], [1, 1, 1]], color: "blue" } // J
];

// 렌더링
function renderBoard() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      cells[idx].style.backgroundColor = boardState[y][x] || "black";
      cells[idx].style.opacity = 1;
    }
  }

  if (!currentBlock) return;

  const ghostPos = getGhostPosition(currentBlock, position);
  currentBlock.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) {
        const gx = ghostPos.x + dx, gy = ghostPos.y + dy;
        if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) {
          const idx = gy * cols + gx;
          if (!(gx === position.x + dx && gy === position.y + dy)) {
            cells[idx].style.backgroundColor = currentBlock.color;
            cells[idx].style.opacity = 0.3;
          }
        }
      }
    });
  });

  currentBlock.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) {
        const x = position.x + dx, y = position.y + dy;
        if (y >= 0 && y < rows && x >= 0 && x < cols) {
          const idx = y * cols + x;
          cells[idx].style.backgroundColor = currentBlock.color;
          cells[idx].style.opacity = 1;
        }
      }
    });
  });
}

// 충돌
function collision(block, pos) {
  return block.shape.some((row, dy) => row.some((val, dx) => {
    if (val) {
      const x = pos.x + dx, y = pos.y + dy;
      return x < 0 || x >= cols || y >= rows || (y >= 0 && boardState[y][x]);
    } return false;
  }));
}

function getGhostPosition(block, pos) {
  let ghost = { ...pos };
  while (!collision(block, { x: ghost.x, y: ghost.y + 1 })) ghost.y++;
  return ghost;
}

// 회전
function rotateBlock(block) {
  const shape = block.shape;
  const newShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
  return { shape: newShape, color: block.color };
}
function tryRotate(block, pos) {
  const rotated = rotateBlock(block);
  if (!collision(rotated, pos)) return rotated;
  const kicks = [-1, 1, -2, 2];
  for (let dx of kicks) {
    const newPos = { x: pos.x + dx, y: pos.y };
    if (!collision(rotated, newPos)) { position = newPos; return rotated; }
  }
  return block;
}

// 랜덤
function getRandomBlock() { return tetrominoes[Math.floor(Math.random() * tetrominoes.length)]; }

// 스폰
function spawnBlock() {
  currentBlock = nextBlock || getRandomBlock();
  nextBlock = getRandomBlock();
  position = { x: 4, y: 0 };
  canHold = true;
  renderPreviews();
  if (collision(currentBlock, position)) { gameOver(); return; }
  renderBoard();
}

// 홀드
function hold() {
  if (!canHold) return;
  if (!holdBlock) { holdBlock = currentBlock; spawnBlock(); }
  else { const temp = holdBlock; holdBlock = currentBlock; currentBlock = temp; position = { x: 4, y: 0 }; }
  canHold = false;
  renderPreviews(); renderBoard();
}

// 낙하
function dropBlock() {
  position.y++;
  if (collision(currentBlock, position)) {
    position.y--;
    const tSpin = isTSpin(currentBlock, position);
    fixBlock(currentBlock, position, tSpin);
    spawnBlock();
    return;
  }
  renderBoard();
}

// T-Spin 체크
function isTSpin(block, pos) {
  if (block.color !== "purple") return false;
  const corners = [{ x: pos.x, y: pos.y }, { x: pos.x + 2, y: pos.y }, { x: pos.x, y: pos.y + 2 }, { x: pos.x + 2, y: pos.y + 2 }];
  let count = 0;
  for (let c of corners) if (c.x < 0 || c.x >= cols || c.y >= rows || (c.y >= 0 && boardState[c.y][c.x])) count++;
  return count >= 3;
}

// 고정 + 점수
function fixBlock(block, pos, isTSpin = false) {
  block.shape.forEach((row, dy) => row.forEach((val, dx) => {
    if (val) { const x = pos.x + dx, y = pos.y + dy; if (y >= 0 && y < rows && x >= 0 && x < cols) boardState[y][x] = block.color; }
  }));
  block.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (y >= 0 && y < rows && x >= 0 && x < cols) {
          const idx = y * cols + x;
          cells[idx].classList.add("impact");

          setTimeout(() => {
            cells[idx].classList.remove("impact");
          }, 150);
        }
      }
    });
  });
  const lines = checkLines();
  if (lines > 0) {
    linesClearedTotal += lines;
    level = Math.floor(linesClearedTotal / 10) + 1;
    dropInterval = Math.max(50, 500 - (level - 1) * 50);
    document.getElementById("level-value").textContent = level;

    // 점수 계산 (콤보 제외)
    let lineScore = 0;
    if (isTSpin) {
      lineScore = [0, 800, 1200, 1600][lines] || 0;
      backToBack = true;
      showTSpin();
    } else {
      lineScore = [0, 100, 300, 500, 800][lines] || 0;
      if (lines >= 4) backToBack = true;
      else if (lines > 0 && backToBack) { lineScore = Math.floor(lineScore * 1.5); backToBack = false; }
      else backToBack = false;
    }
    score += lineScore;
    document.getElementById("score-value").textContent = score;
  }
  animateClear();
}

// 라인 제거
function checkLines() {
  let linesToClear = [];

  // 삭제할 줄 찾기
  for (let y = 0; y < rows; y++) {
    if (boardState[y].every(cell => cell !== null)) {
      linesToClear.push(y);
    }
  }

  if (linesToClear.length === 0) return 0;
  linesToClear.forEach(y => {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      cells[idx].classList.add("clear-effect");
    }
  });
  // 🔥 애니메이션 (먼저 보여주기)
  linesToClear.forEach(y => {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      cells[idx].style.backgroundColor = "white";
    }
  });

  // 🔥 실제 삭제는 나중에
  setTimeout(() => {
    linesToClear.forEach(y => {
      boardState.splice(y, 1);
      boardState.unshift(Array(cols).fill(null));
    });

    renderBoard();
  }, 100);

  return linesToClear.length;
}
function animateClear() { renderBoard(); }

// T-Spin 알림
function showTSpin() {
  const notify = document.getElementById("tspin-notify");
  notify.textContent = "T-SPIN!";
  setTimeout(() => notify.textContent = "", 800);
}

// 속도
let normalInterval = 500, fastInterval = 100, isSoftDropping = false;
function startDrop() { if (dropTimer) clearInterval(dropTimer); dropTimer = setInterval(dropBlock, dropInterval); }

// 키 입력
document.addEventListener("keydown", (e) => {

  // ESC 처리
  if (e.key === "Escape") {
    if (!isPaused) pauseGame();
    else resumeGame();
    return;
  }

  if (isPaused) return; // 일시정지 중에는 다른 키 무시

  if (e.key === "ArrowUp" && keyPressed[e.key]) return;
  if (e.key === "ArrowUp") keyPressed[e.key] = true;

  switch (e.key) {
    case "ArrowLeft":
      position.x--;
      if (collision(currentBlock, position)) position.x++;
      break;
    case "ArrowRight":
      position.x++;
      if (collision(currentBlock, position)) position.x--;
      break;
    case "ArrowUp":
      currentBlock = tryRotate(currentBlock, position);
      break;
    case " ":
      while (!collision(currentBlock, { x: position.x, y: position.y + 1 })) {
        position.y++;
      }
      fixBlock(currentBlock, position);
      spawnBlock();
      return;
    case "c":
    case "C":
      if (canHold) hold();
      break;
    case "ArrowDown":
      if (!isSoftDropping) {
        isSoftDropping = true;
        dropInterval = fastInterval;
        startDrop();
      }
      break;
  }

  renderBoard();
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp") keyPressed[e.key] = false;
  if (e.key === "ArrowDown") { isSoftDropping = false; dropInterval = normalInterval; startDrop(); }
});

// 시작
document.getElementById("start").addEventListener("click", () => {
  document.getElementById("start").style.display = "none";
  score = 0; linesClearedTotal = 0; level = 1; backToBack = false;
  nextBlock = getRandomBlock();
  document.getElementById("score-value").textContent = score;
  document.getElementById("level-value").textContent = level;
  spawnBlock();
  startDrop();
});

// Preview
function renderPreviews() {
  renderPreview(nextBlock, document.querySelector("#next .preview"));
  renderPreview(holdBlock, document.querySelector("#hold .preview"));
}
function renderPreview(block, container) {
  container.innerHTML = "";
  if (!block) return;
  const size = 20;
  block.shape.forEach(row => {
    const line = document.createElement("div"); line.style.display = "flex";
    row.forEach(val => {
      const cell = document.createElement("div"); cell.style.width = size + "px"; cell.style.height = size + "px";
      if (val) { cell.style.backgroundColor = block.color; cell.style.border = "1px solid #333"; }
      line.appendChild(cell);
    });
    container.appendChild(line);
  });
}

// 게임 오버
function gameOver() {
  clearInterval(dropTimer);
  alert("Game Over!");
  boardState = Array.from({ length: rows }, () => Array(cols).fill(null));
  currentBlock = null; holdBlock = null; nextBlock = null;
  renderPreviews(); renderBoard();
  document.getElementById("start").style.display = "block";
}

let isPaused = false;

function pauseGame() {
  isPaused = true;
  clearInterval(dropTimer);
  document.getElementById("tspin-notify").textContent = "PAUSED"; // 안내 표시
}

function resumeGame() {
  isPaused = false;
  document.getElementById("tspin-notify").textContent = "";
  startDrop();
}