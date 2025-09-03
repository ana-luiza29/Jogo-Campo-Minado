document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");
  const endScreen = document.getElementById("end-screen");
  const gameBoard = document.getElementById("game-board");
  const timerElement = document.getElementById("timer");
  const playerDisplay = document.getElementById("player-display");
  const scoreDisplay = document.getElementById("score-display");
  const endMessageElement = document.getElementById("end-message");
  const finalScoreElement = document.getElementById("final-score");
  const difficultySelect = document.getElementById("difficulty");

  // Sons
  const boomAudio = document.getElementById("boom-sound");
  const defeatAudio = document.getElementById("defeat-sound");
  const victoryAudio = document.getElementById("victory-sound");

  // Variáveis globais
  let board = [];
  let rows, cols, mines;
  let timeLeft, timerInterval;
  let playerName = "";
  let score = 0;
  let gameOver = false;
  let firstClick = true;
  let currentLevel = "easy";

  const levels = {
    easy: { rows: 8, cols: 8, mines: 10, time: 120 },
    medium: { rows: 16, cols: 16, mines: 40, time: 240 },
    hard: { rows: 24, cols: 24, mines: 99, time: 360 }
  };

  // --- Funções de som ---
  function playBoomSound() {
    boomAudio.currentTime = 0;
    boomAudio.play().catch(e => console.error("Erro ao reproduzir explosão:", e));
  }

  function playDefeatSound() {
    defeatAudio.currentTime = 0;
    defeatAudio.play().catch(e => console.error("Erro ao reproduzir derrota:", e));
  }

  function playVictorySound() {
    victoryAudio.currentTime = 0;
    victoryAudio.play().catch(e => console.error("Erro ao reproduzir vitória:", e));
  }

  // --- Funções principais ---
  window.startGame = function () {
    playerName = document.getElementById("player-name").value.trim();
    if (!playerName) {
      alert("Digite seu nome!");
      return;
    }

    currentLevel = difficultySelect.value;
    ({ rows, cols, mines, time: timeLeft } = levels[currentLevel]);

    score = 0;
    gameOver = false;
    firstClick = true;
    updateScoreDisplay();

    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    playerDisplay.textContent = `Jogador: ${playerName}`;
    renderBoard(rows, cols);

    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
  };

  function renderBoard(r, c) {
    board = Array.from({ length: r }, () =>
      Array.from({ length: c }, () => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0
      }))
    );

    gameBoard.innerHTML = "";
    gameBoard.style.gridTemplateRows = `repeat(${r}, 1fr)`;
    gameBoard.style.gridTemplateColumns = `repeat(${c}, 1fr)`;

    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const cellElement = document.createElement("button");
        cellElement.classList.add("cell", "w-8", "h-8", "sm:w-10", "sm:h-10");
        cellElement.dataset.row = i;
        cellElement.dataset.col = j;
        cellElement.addEventListener("click", () => handleCellClick(i, j));
        cellElement.addEventListener("contextmenu", e => {
          e.preventDefault();
          handleRightClick(i, j);
        });
        gameBoard.appendChild(cellElement);
      }
    }
  }

  function placeMines(r, c, m, safeRow, safeCol) {
    let placedMines = 0;
    while (placedMines < m) {
      const row = Math.floor(Math.random() * r);
      const col = Math.floor(Math.random() * c);
      if (
        !board[row][col].isMine &&
        !(Math.abs(row - safeRow) <= 1 && Math.abs(col - safeCol) <= 1)
      ) {
        board[row][col].isMine = true;
        placedMines++;
      }
    }
    calculateAdjacentMines();
  }

  function calculateAdjacentMines() {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (board[i][j].isMine) continue;
        let count = 0;
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            const ni = i + x, nj = j + y;
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && board[ni][nj].isMine) {
              count++;
            }
          }
        }
        board[i][j].adjacentMines = count;
      }
    }
  }

  function handleCellClick(row, col) {
    if (gameOver) return;
    const cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    if (firstClick) {
      const { rows, cols, mines } = levels[currentLevel];
      placeMines(rows, cols, mines, row, col);
      firstClick = false;
    }

    if (cell.isMine) {
      playBoomSound();
      endGame(false, "Você acionou uma mina!");
      return;
    }

    revealCell(row, col);
    checkWinCondition();
  }

  function handleRightClick(row, col) {
    if (gameOver) return;
    const cell = board[row][col];
    if (cell.isRevealed) return;
    cell.isFlagged = !cell.isFlagged;
    updateCellAppearance(row, col);
  }

  function revealCell(row, col) {
    const cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    updateCellAppearance(row, col);

    if (cell.adjacentMines === 0 && !cell.isMine) {
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          const ni = row + x, nj = col + y;
          if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
            revealCell(ni, nj);
          }
        }
      }
    }
    score += 10;
    updateScoreDisplay();
  }

  function updateCellAppearance(row, col) {
    const cell = board[row][col];
    const cellElement = document.querySelector(
      `.cell[data-row='${row}'][data-col='${col}']`
    );
    if (cell.isRevealed) {
      cellElement.classList.add("revealed");
      if (cell.isMine) {
        cellElement.textContent = "💣";
      } else if (cell.adjacentMines > 0) {
        cellElement.textContent = cell.adjacentMines;
      }
    } else if (cell.isFlagged) {
      cellElement.textContent = "🚩";
    } else {
      cellElement.textContent = "";
      cellElement.classList.remove("revealed");
    }
  }

  function checkWinCondition() {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = board[i][j];
        if (!cell.isMine && !cell.isRevealed) return;
      }
    }
    endGame(true);
  }

  function updateTimer() {
    if (gameOver) return;
    if (timeLeft <= 0) {
      endGame(false, "Tempo esgotado!");
      return;
    }
    timeLeft--;
    timerElement.textContent = `Tempo: ${timeLeft}s`;
  }

  function updateScoreDisplay() {
    scoreDisplay.textContent = `Pontuação: ${score}`;
  }

  function endGame(isWin, message = "") {
    gameOver = true;
    clearInterval(timerInterval);
    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");

    if (isWin) {
      endMessageElement.textContent = `Parabéns, ${playerName}! Você Venceu!`;
      endMessageElement.classList.add("text-green-400");
      endMessageElement.classList.remove("text-red-400");
      playVictorySound();
    } else {
      endMessageElement.textContent = message || `Game Over, ${playerName}!`;
      endMessageElement.classList.add("text-red-400");
      endMessageElement.classList.remove("text-green-400");
      playDefeatSound();
    }

    finalScoreElement.textContent = score;
    saveScore(playerName, score);
  }

  function saveScore(name, score) {
    const ranking = JSON.parse(localStorage.getItem("ranking")) || [];
    ranking.push({ name, score });
    ranking.sort((a, b) => b.score - a.score);
    localStorage.setItem("ranking", JSON.stringify(ranking));
  }

  window.restartGame = function () {
    endScreen.classList.add("hidden");
    startGame();
  };

  window.backToStart = function () {
    gameScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    clearInterval(timerInterval);
  };
});
