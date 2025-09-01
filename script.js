document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const splashScreen = document.getElementById('splash-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    const playerNameInput = document.getElementById('player-name');
    const nameError = document.getElementById('name-error');
    const startGameBtn = document.getElementById('start-game-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const boardElement = document.getElementById('game-board');
    const difficultySelector = document.getElementById('difficulty-selector');

    // Exibição de informações
    const displayNameElement = document.getElementById('display-player-name');
    const displayLevelElement = document.getElementById('display-level');
    const displayScoreElement = document.getElementById('display-score');
    const displayTimerElement = document.getElementById('display-timer');
    const rankingListElement = document.getElementById('ranking-list');
    
    // Exibição de fim de jogo
    const endMessageElement = document.getElementById('end-message');
    const finalScoreElement = document.getElementById('final-score');
    const endReasonElement = document.getElementById('end-reason');

    // Constantes
    const RANKING_KEY = 'minesweeperRanking';
    const MAX_RANKING_ENTRIES = 5;

    // Configurações de Nível
    const levels = {
        'Fácil': { rows: 8, cols: 8, mines: 10, time: 300 }, // 5 minutos
        'Médio': { rows: 16, cols: 16, mines: 40, time: 900 }, // 15 minutos
        'Difícil': { rows: 24, cols: 24, mines: 99, time: 1800 } // 30 minutos
    };

    // Estado do Jogo
    let playerName = '';
    let currentLevel = '';
    let board = [];
    let score = 0;
    let gameOver = false;
    let firstClick = true;
    let revealedCells = 0;
    let timerInterval;
    let timeLeft = 0;
    
    // --- Funções do Ranking ---

    function getRanking() {
        const rankingJSON = localStorage.getItem(RANKING_KEY);
        return rankingJSON ? JSON.parse(rankingJSON) : [];
    }

    function saveRanking(ranking) {
        localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
    }

    function addScoreToRanking(name, score) {
        const ranking = getRanking();
        ranking.push({ name, score });
        ranking.sort((a, b) => b.score - a.score);
        const updatedRanking = ranking.slice(0, MAX_RANKING_ENTRIES);
        saveRanking(updatedRanking);
    }

    function displayRanking() {
        const ranking = getRanking();
        rankingListElement.innerHTML = ''; // Limpa a lista
        if (ranking.length === 0) {
            rankingListElement.innerHTML = '<p class="text-gray-400">Nenhuma pontuação registrada ainda.</p>';
            return;
        }
        ranking.forEach((entry, index) => {
            const li = document.createElement('li');
            li.classList.add('flex', 'justify-between');
            li.innerHTML = `
                <span>${index + 1}. <span class="rank-name">${entry.name}</span></span>
                <span class="rank-score">${entry.score}</span>
            `;
            rankingListElement.appendChild(li);
        });
    }

    // --- Lógica do Jogo ---

    // Inicia o jogo
    startGameBtn.addEventListener('click', () => {
        playerName = playerNameInput.value.trim();
        if (playerName === '') {
            nameError.classList.remove('hidden');
            return;
        }
        nameError.classList.add('hidden');
        splashScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        endScreen.classList.add('hidden');
        displayNameElement.textContent = playerName;
        resetGameValues();
    });
    
    // Seleciona a dificuldade
    difficultySelector.addEventListener('click', (e) => {
        if(e.target.classList.contains('level-btn')) {
            const level = e.target.dataset.level;
            currentLevel = level;
            displayLevelElement.textContent = level;
            difficultySelector.classList.add('hidden');
            boardElement.classList.remove('hidden');
            setupGame(level);
        }
    });

    // Configura o jogo para um nível específico
    function setupGame(level) {
        const { rows, cols, time } = levels[level];
        firstClick = true;
        gameOver = false;
        revealedCells = 0;
        score = 0;
        displayScoreElement.textContent = 0;
        timeLeft = time;
        createBoard(rows, cols);
        renderBoard(rows, cols);
        startTimer();
    }

    // Cria a estrutura lógica do tabuleiro
    function createBoard(rows, cols) {
        board = Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            adjacentMines: 0
        })));
    }

    // Posiciona as minas no tabuleiro após o primeiro clique
    function placeMines(rows, cols, mines, initialRow, initialCol) {
        let minesPlaced = 0;
        while (minesPlaced < mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            const isInitialClickArea = Math.abs(r - initialRow) <= 1 && Math.abs(c - initialCol) <= 1;
            if (!board[r][c].isMine && !isInitialClickArea) {
                board[r][c].isMine = true;
                minesPlaced++;
            }
        }
        calculateAdjacentMines(rows, cols);
    }

    // Calcula o número de minas adjacentes para cada célula
    function calculateAdjacentMines(rows, cols) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isMine) continue;
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        const nr = r + i;
                        const nc = c + j;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                board[r][c].adjacentMines = count;
            }
        }
    }

    // Renderiza o tabuleiro na tela
    function renderBoard(rows, cols) {
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('button');
                cell.classList.add('cell', 'bg-gray-600', 'hover:bg-gray-500', 'rounded-md');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', () => handleCellClick(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleRightClick(r, c);
                });
                boardElement.appendChild(cell);
            }
        }
    }
    
    // Lógica para o clique na célula
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
            endGame(false, "Você acionou uma mina!");
            return;
        }

        revealCell(row, col);
        checkWinCondition();
    }
    
    // Lógica para o clique com o botão direito (marcar/desmarcar)
    function handleRightClick(row, col) {
        if (gameOver || board[row][col].isRevealed) return;
        board[row][col].isFlagged = !board[row][col].isFlagged;
        updateCellAppearance(row, col);
    }
    
    // Revela a célula
    function revealCell(row, col) {
        const { rows, cols } = levels[currentLevel];
        if (row < 0 || row >= rows || col < 0 || col >= cols) return;
        const cell = board[row][col];
        if (cell.isRevealed) return;
        
        cell.isRevealed = true;
        revealedCells++;
        updateCellAppearance(row, col);

        if(cell.adjacentMines > 0) {
            score += 50;
        } else {
            score += 10;
        }
        displayScoreElement.textContent = score;

        if (cell.adjacentMines === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    revealCell(row + i, col + j);
                }
            }
        }
    }

    // Atualiza a aparência da célula na UI
    function updateCellAppearance(row, col) {
        const cellElement = boardElement.querySelector(`[data-row='${row}'][data-col='${col}']`);
        const cellData = board[row][col];
        cellElement.classList.remove('bg-gray-600', 'hover:bg-gray-500');
        if (cellData.isFlagged) {
            cellElement.textContent = '🚩';
            cellElement.classList.add('bg-yellow-500');
        } else {
            cellElement.textContent = '';
            cellElement.classList.remove('bg-yellow-500');
            cellElement.classList.add('bg-gray-600');
        }
        if (cellData.isRevealed) {
            cellElement.classList.add('revealed');
            cellElement.disabled = true;
            if (cellData.isMine) {
                cellElement.textContent = '💣';
                cellElement.classList.add('bg-red-700');
            } else if (cellData.adjacentMines > 0) {
                cellElement.textContent = cellData.adjacentMines;
                cellElement.classList.add(`c${cellData.adjacentMines}`);
            }
        }
    }

    // Verifica a condição de vitória
    function checkWinCondition() {
        const { rows, cols, mines } = levels[currentLevel];
        if (revealedCells === (rows * cols) - mines) {
            endGame(true, `Tempo Restante: ${formatTime(timeLeft)}`);
        }
    }

    // Inicia o cronômetro
    function startTimer() {
        clearInterval(timerInterval);
        displayTimerElement.textContent = formatTime(timeLeft);
        timerInterval = setInterval(() => {
            timeLeft--;
            displayTimerElement.textContent = formatTime(timeLeft);
            if (timeLeft <= 0) {
                endGame(false, "O tempo acabou!");
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Finaliza o jogo
    function endGame(isWin, reason) {
        gameOver = true;
        clearInterval(timerInterval);
        const { rows, cols } = levels[currentLevel];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isMine) {
                    board[r][c].isRevealed = true;
                    updateCellAppearance(r, c);
                }
            }
        }

        gameScreen.classList.add('hidden');
        endScreen.classList.remove('hidden');

        if (isWin) {
            endMessageElement.textContent = `Parabéns, ${playerName}! Você Venceu!`;
            endMessageElement.classList.add('text-green-400');
            endMessageElement.classList.remove('text-red-400');
        } else {
            endMessageElement.textContent = `Game Over, ${playerName}!`;
            endMessageElement.classList.add('text-red-400');
            endMessageElement.classList.remove('text-green-400');
        }
        
        // Adiciona a pontuação ao ranking e atualiza a exibição imediatamente.
        addScoreToRanking(playerName, score); 
        displayRanking();

        finalScoreElement.textContent = score;
        endReasonElement.textContent = reason;
    }
    
    // Reseta os valores para um novo jogo
    function resetGameValues() {
        clearInterval(timerInterval);
        score = 0;
        currentLevel = '';
        displayScoreElement.textContent = '0';
        displayLevelElement.textContent = '-';
        displayTimerElement.textContent = '--:--';
        boardElement.innerHTML = '';
        boardElement.classList.add('hidden');
        difficultySelector.classList.remove('hidden');
    }

    // Botão para jogar novamente
    playAgainBtn.addEventListener('click', () => {
        endScreen.classList.add('hidden');
        splashScreen.classList.remove('hidden');
        playerNameInput.value = ''; // Limpa o nome para uma nova sessão
        displayRanking(); // Atualiza o ranking na tela inicial
    });
    
    // Inicialização
    displayRanking(); // Exibe o ranking ao carregar a página
});
