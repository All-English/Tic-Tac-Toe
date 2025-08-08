import { smartPhonicsWordBank, playerSymbols, englishVoices } from "./config.js"

const PLAYER_SETS_KEY = "phonics_player_sets"
const STATS_KEY = "wordTacToe_stats"
let lastVoiceId = null

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let gameState = {
    currentView: "setup",
    isMuted: false,
    setup: {
      players: [],
      // We can add other setup-specific state here later
    },
  }
  let areGameEventListenersAttached = false
  let wordCache = []
  let isOrderLocked = false

  const sounds = {
    click: new Audio("sounds/click.mp3"),
    block: new Audio("sounds/block.mp3"),
    score: new Audio("sounds/score.mp3"),
    gameOver: new Audio("sounds/game-over.mp3"),
  }

  const playerRadii = [
    "var(--radius-drawn-1)",
    "var(--radius-drawn-2)",
    "var(--radius-drawn-3)",
    "var(--radius-drawn-4)",
    "var(--radius-drawn-5)",
    "var(--radius-drawn-6)",
  ]

  // --- API KEY MANAGEMENT ---

  const apiKeyInput = document.getElementById("elevenlabs-api-key")
  let userApiKey = ""

  // 1. On page load, try to get the key from localStorage
  const savedKey = localStorage.getItem("elevenlabs_api_key")
  if (savedKey) {
    userApiKey = savedKey
    apiKeyInput.value = userApiKey
  }

  // 2. When the user types in the input, update the variable and save to localStorage
  apiKeyInput.addEventListener("input", () => {
    userApiKey = apiKeyInput.value
    localStorage.setItem("elevenlabs_api_key", userApiKey)
  })

  // --- DOM ELEMENTS ---

  const setupView = document.getElementById("game-setup")
  const gameView = document.getElementById("game-view")
  const playerInfoList = document.getElementById("player-info-list")
  const gameBoard = document.getElementById("game-board")
  const gameControls = document.getElementById("game-controls")
  const numPlayersInput = document.getElementById("numPlayers")
  const numPlayersValue = document.getElementById("numPlayersValue")
  const playerNamesContainer = document.getElementById("player-names-container")
  const gridSizeInput = document.getElementById("gridSize")
  const gridSizeValue = document.getElementById("gridSizeValue")
  const matchLengthInput = document.getElementById("matchLength")
  const matchLengthValue = document.getElementById("matchLengthValue")
  const unitSelectorsContainer = document.getElementById(
    "unit-selectors-container"
  )
  const addUnitBtn = document.getElementById("addUnitBtn")
  const removeAllUnitsBtn = document.getElementById("removeAllUnitsBtn")
  const startGameBtn = document.getElementById("startGameBtn")
  const showLinesToggle = document.getElementById("showLinesToggle")
  const randomizeOrderBtn = document.getElementById("randomizeOrderBtn")
  const gameDialog = document.getElementById("game-over-dialog")
  const muteSoundsToggle = document.getElementById("muteSoundsToggle")
  const resetGameBtn = document.getElementById("resetGameBtn")
  const backToSettingsBtn = document.getElementById("settings-btn")
  const playAgainBtn = document.getElementById("play-again-btn")
  const closeDialogBtn = document.getElementById("close-dialog-btn")
  const pronounceWordsToggle = document.getElementById("pronounceWordsToggle")
  const gameModeSelector = document.getElementById("gameModeSelector")
  const randomizeGameModeBtn = document.getElementById("randomizeGameModeBtn")
  const gameModeHint = document.getElementById("gameModeHint")
  const resetSettingsBtn = document.getElementById("resetSettingsBtn")
  const manageSetsBtn = document.getElementById("manage-sets-btn")
  const playerSetsDialog = document.getElementById("player-sets-dialog")
  const savedSetsList = document.getElementById("saved-sets-list")
  const saveSetNameInput = document.getElementById("save-set-name-input")
  const saveSetBtn = document.getElementById("save-set-btn")
  const closeSetsDialogBtn = document.getElementById("close-sets-dialog-btn")
  const statsView = document.getElementById("stats-view") // Add this
  const showStatsBtn = document.getElementById("show-stats-btn") // Add this
  const backToSetupBtn = document.getElementById("back-to-setup-btn") // Add this
  const statsPlayerSelect = document.getElementById("stats-player-select") // Add this
  const statsDisplayArea = document.getElementById("stats-display-area") // Add this

  // --- EVENT HANDLER FUNCTIONS ---

  const handleCloseDialog = () => {
    gameDialog.close()
  }

  const handleReset = () => enterReorderMode()

  const handlePlayAgain = () => {
    gameDialog.close()
    enterReorderMode()
  }
  const handleKeydown = (e) => {
    if (e.key === "Backspace") {
      undoLastMove()
    }
  }

  const handleBackToSettings = () => {
    removeGameEventListeners()
    isOrderLocked = false

    // Rebuild the .setup.players object from the previous game's playerNames
    const playersFromLastGame = gameState.playerNames.map((name, index) => ({
      id: Date.now() + index, // IDs are regenerated for the setup screen
      name: name,
    }))

    // Reset the gameState to the initial structure, preserving players
    gameState = {
      ...gameState, // Carry over settings like gridSize, etc.
      currentView: "setup",
      setup: {
        players: playersFromLastGame,
      },
    }

    render()
  }

  // --- EVENT LISTENER MANAGEMENT ---

  function addGameEventListeners() {
    if (areGameEventListenersAttached) return

    resetGameBtn.addEventListener("click", handleReset)
    backToSettingsBtn.addEventListener("click", handleBackToSettings)
    playAgainBtn.addEventListener("click", handlePlayAgain)
    closeDialogBtn.addEventListener("click", handleCloseDialog)
    document.addEventListener("keydown", handleKeydown)

    areGameEventListenersAttached = true
  }

  function removeGameEventListeners() {
    if (!areGameEventListenersAttached) return

    resetGameBtn.removeEventListener("click", handleReset)
    backToSettingsBtn.removeEventListener("click", handleBackToSettings)
    playAgainBtn.removeEventListener("click", handlePlayAgain)
    closeDialogBtn.removeEventListener("click", handleCloseDialog)
    document.removeEventListener("keydown", handleKeydown)

    areGameEventListenersAttached = false
  }

  // --- MAIN RENDER FUNCTION ---

  function render() {
    renderViews()

    if (gameState.currentView === "stats") {
      renderStatsView()
    } else if (
      gameState.currentView === "reorder" ||
      gameState.currentView === "game"
    ) {
      renderPlayerInfo()
      renderBoard()
      if (gameState.currentView === "game") {
        renderWinLines()
      }
    }
  }

  function renderViews() {
    const { currentView } = gameState

    setupView.classList.toggle("is-active", currentView === "setup")
    statsView.classList.toggle("is-active", currentView === "stats")
    gameView.classList.toggle(
      "is-active",
      currentView === "reorder" || currentView === "game"
    )

    // Add/remove a class to the game view itself to control reorder UI
    gameView.classList.toggle("reorder-active", currentView === "reorder")

    const reorderControls = document.getElementById("reorder-controls")
    if (reorderControls) {
      reorderControls.classList.toggle("hidden", currentView !== "reorder")
    }

    // The rest of the logic remains similar but simplified
    playerInfoList.classList.toggle(
      "hidden",
      currentView !== "reorder" && currentView !== "game"
    )
    gameBoard.classList.toggle(
      "hidden",
      currentView !== "reorder" && currentView !== "game"
    )
    gameControls.classList.toggle(
      "hidden",
      currentView !== "reorder" && currentView !== "game"
    )
  }

  // --- RENDERING SUB-FUNCTIONS ---

  function renderBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`
    const newTotalCells = gameState.gridSize * gameState.gridSize

    // Clean up cells from a previously larger grid
    const allCurrentCells = gameBoard.querySelectorAll(".cell")
    allCurrentCells.forEach((cell) => {
      if (parseInt(cell.dataset.index, 10) >= newTotalCells) {
        cell.remove()
      }
    })

    // Main render loop
    for (let i = 0; i < newTotalCells; i++) {
      let cell = gameBoard.querySelector(`[data-index='${i}']`)

      if (!cell) {
        cell = document.createElement("button")
        cell.classList.add("button", "cell")
        cell.dataset.index = i
        cell.addEventListener("click", handleCellClick)
        gameBoard.appendChild(cell)
      }

      const wordObject = wordCache[i] || { word: "?", target: "" }
      const newHTML = highlightTargetSounds(wordObject.word, wordObject.target)
      // Only update innerHTML if it has actually changed
      if (cell.innerHTML !== newHTML) {
        cell.innerHTML = newHTML
      }

      const cellState = gameState.board[i]
      const shouldBeDisabled = cellState !== null
      // Only update the disabled property if it has changed
      if (cell.disabled !== shouldBeDisabled) {
        cell.disabled = shouldBeDisabled
      }

      const newSymbol = shouldBeDisabled ? playerSymbols[cellState] : null
      // Only update the data-player-symbol if it has changed
      if (cell.dataset.playerSymbol !== newSymbol) {
        if (newSymbol) {
          cell.dataset.playerSymbol = newSymbol
          cell.style.setProperty(
            "--player-color",
            gameState.playerColors[cellState]
          )
        } else {
          cell.removeAttribute("data-player-symbol")
          cell.style.removeProperty("--player-color")
        }
      }

      const shouldBeHighlighted = gameState.highlightedCells.has(i)
      // Only update the highlight class if it has changed
      if (cell.classList.contains("highlight") !== shouldBeHighlighted) {
        cell.classList.toggle("highlight", shouldBeHighlighted)
      }
    }
  }

  function renderPlayerInfo() {
    playerInfoList.innerHTML = "" // Clear the list to re-render in new order

    const {
      playerNames,
      scores,
      currentPlayer,
      playerColors,
      playerRadii,
      eliminatedPlayers,
      currentView,
    } = gameState
    const isReordering = currentView === "reorder"

    playerNames.forEach((name, i) => {
      const playerBlock = document.createElement("div")
      playerBlock.id = `player-info-block-${i}`
      playerBlock.className = "card outlined player-info-block"
      playerBlock.dataset.index = i // Set index for drag-drop

      // Add badge classes and set the symbol in the aria-label
      playerBlock.classList.add("badge")
      playerBlock.setAttribute("aria-label", playerSymbols[i])

      // Add drag-and-drop functionality only in reorder mode
      if (isReordering) {
        playerBlock.draggable = true
        playerBlock.addEventListener("dragstart", handleDragStart)
        playerBlock.addEventListener("dragend", handleDragEnd)
      }

      playerBlock.innerHTML = `
      <hgroup><h3 data-role="name">${name}</h3></hgroup>
      <div class="content" data-role="score">${scores[i]}</div>
    `

      playerBlock.style.setProperty("--player-color", playerColors[i])
      if (playerRadii && playerRadii[i]) {
        playerBlock.style.borderRadius = playerRadii[i]
      }

      playerBlock.classList.toggle(
        "current-player",
        i === currentPlayer && !isReordering
      )
      playerBlock.classList.toggle("eliminated", eliminatedPlayers?.includes(i))

      playerInfoList.appendChild(playerBlock)
    })
  }

  function renderWinLines() {
    const existingLines = new Set(
      Array.from(gameBoard.querySelectorAll(".strike-through-line")).map(
        (el) => el.id
      )
    )
    const requiredLines = new Set(
      gameState.winLinesToDraw.map((line) => line.id)
    )

    // Remove lines that are in the DOM but not in the state
    existingLines.forEach((lineId) => {
      if (!requiredLines.has(lineId)) {
        document.getElementById(lineId)?.remove()
      }
    })

    // Add lines that are in the state but not in the DOM
    gameState.winLinesToDraw.forEach((lineData) => {
      if (!existingLines.has(lineData.id)) {
        const startCell = gameBoard.querySelector(
          `[data-index='${lineData.start}']`
        )
        const endCell = gameBoard.querySelector(
          `[data-index='${lineData.end}']`
        )
        if (startCell && endCell) {
          const lineElement = drawLine(startCell, endCell, lineData.color)
          lineElement.id = lineData.id
        }
      }
    })
  }

  function renderStatsView() {
    const stats = getStats()
    const playerIds = Object.keys(stats)

    statsPlayerSelect.innerHTML = ""
    if (playerIds.length === 0) {
      const option = document.createElement("option")
      option.textContent = "-- No stats saved --"
      statsPlayerSelect.appendChild(option)
      statsDisplayArea.innerHTML =
        "<p class='field-hint'>Play a game to see stats here!</p>"
      return
    }

    // Populate the player selection dropdown, sorting names alphabetically
    const sortedPlayerOptions = playerIds
      .map((id) => ({ id, name: stats[id].name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    sortedPlayerOptions.forEach((player) => {
      const option = document.createElement("option")
      option.value = player.id
      option.textContent = player.name
      statsPlayerSelect.appendChild(option)
    })

    const displayStatsForPlayer = (playerId) => {
      const playerData = stats[playerId]
      if (!playerData) {
        statsDisplayArea.innerHTML = ""
        return
      }

      let nemesisName = "N/A"
      let maxLosses = 0
      if (playerData.nemesis) {
        for (const name in playerData.nemesis) {
          if (playerData.nemesis[name] > maxLosses) {
            maxLosses = playerData.nemesis[name]
            nemesisName = name
          }
        }
      }
      const nemesisDisplay =
        maxLosses > 0 ? `${nemesisName} (${maxLosses} losses)` : "N/A"

      // --- Function to build config-specific stats tables ---
      const buildConfigTable = (configs, mode) => {
        if (Object.keys(configs).length === 0)
          return "<p class='field-hint'>No games played in this configuration.</p>"

        let tableHTML =
          "<table><thead><tr><th>Board Config</th><th>" +
          (mode === "Stealth" ? "Best Score (Low)" : "High Score") +
          "</th><th>Avg. Points</th></tr></thead><tbody>"
        for (const key in configs) {
          const configData = configs[key]
          const avgPoints =
            configData.gamesPlayed > 0
              ? (configData.totalPoints / configData.gamesPlayed).toFixed(1)
              : 0
          const scoreToDisplay =
            mode === "Stealth" ? configData.bestScore : configData.highScore
          tableHTML += `<tr><td>${key}</td><td>${
            scoreToDisplay ?? "N/A"
          }</td><td>${avgPoints}</td></tr>`
        }
        tableHTML += "</tbody></table>"
        return tableHTML
      }

      statsDisplayArea.innerHTML = `
      <div class="stats-section">
        <h4 class="h5">Overall Stats</h4>
        <ul class="definition-list">
          <li><span class="term">Win Percentage</span><hr><span class="description">${
            playerData.gamesPlayed > 0
              ? ((playerData.wins / playerData.gamesPlayed) * 100).toFixed(0)
              : 0
          }%</span></li>
          <li><span class="term">Games Won</span><hr><span class="description">${
            playerData.wins
          } of ${playerData.gamesPlayed}</span></li>
          <li><span class="term">Longest Win Streak</span><hr><span class="description">${
            playerData.longestWinStreak
          }</span></li>
          <li><span class="term">Nemesis</span><hr><span class="description">${nemesisDisplay}</span></li>
        </ul>
      </div>

      <div class="stats-section">
        <h4 class="h5">Conquest Mode</h4>
        <ul class="definition-list">
          <li><span class="term">Win %</span><hr><span class="description">${
            playerData.modes.conquest.gamesPlayed > 0
              ? (
                  (playerData.modes.conquest.wins /
                    playerData.modes.conquest.gamesPlayed) *
                  100
                ).toFixed(0)
              : 0
          }%</span></li>
          <li><span class="term">Total Blocks</span><hr><span class="description">${
            playerData.modes.conquest.totalBlocks
          }</span></li>
          <li><span class="term">Multi-Line Scores (2/3/4/5/6+)</span><hr><span class="description">${Object.values(
            playerData.modes.conquest.multiLineScoreCounts
          ).join(" / ")}</span></li>
        </ul>
        ${buildConfigTable(playerData.modes.conquest.configs, "Conquest")}
      </div>
      
      <div class="stats-section">
        <h4 class="h5">Stealth Mode</h4>
        <ul class="definition-list">
          <li><span class="term">Win %</span><hr><span class="description">${
            playerData.modes.stealth.gamesPlayed > 0
              ? (
                  (playerData.modes.stealth.wins /
                    playerData.modes.stealth.gamesPlayed) *
                  100
                ).toFixed(0)
              : 0
          }%</span></li>
          <li><span class="term">"Perfect Stealth" Games</span><hr><span class="description">${
            playerData.modes.stealth.perfectStealthGames
          }</span></li>
        </ul>
        ${buildConfigTable(playerData.modes.stealth.configs, "Stealth")}
      </div>
      
      <div class="stats-section">
        <h4 class="h5">Classic Mode</h4>
        <ul class="definition-list">
           <li><span class="term">Win %</span><hr><span class="description">${
             playerData.modes.classic.gamesPlayed > 0
               ? (
                   (playerData.modes.classic.wins /
                     playerData.modes.classic.gamesPlayed) *
                   100
                 ).toFixed(0)
               : 0
           }%</span></li>
           <li><span class="term">Quickest Win</span><hr><span class="description">${
             playerData.modes.classic.quickestWin !== null
               ? `${playerData.modes.classic.quickestWin} turns`
               : "N/A"
           }</span></li>
           <li><span class="term">Total Blocks</span><hr><span class="description">${
             playerData.modes.classic.totalBlocks
           }</span></li>
        </ul>
      </div>
      
      <div class="stats-section">
        <h4 class="h5">Survivor Mode</h4>
        <ul class="definition-list">
           <li><span class="term">Win %</span><hr><span class="description">${
             playerData.modes.survivor.gamesPlayed > 0
               ? (
                   (playerData.modes.survivor.wins /
                     playerData.modes.survivor.gamesPlayed) *
                   100
                 ).toFixed(0)
               : 0
           }%</span></li>
           <li><span class="term">Avg. Survival Rank</span><hr><span class="description">${
             playerData.modes.survivor.gamesFinished > 0
               ? (
                   playerData.modes.survivor.totalSurvivalRank /
                   playerData.modes.survivor.gamesFinished
                 ).toFixed(2)
               : "N/A"
           }</span></li>
           <li><span class="term">Total Blocks</span><hr><span class="description">${
             playerData.modes.survivor.totalBlocks
           }</span></li>
        </ul>
      </div>
    `
    }

    statsPlayerSelect.addEventListener("change", (e) => {
      displayStatsForPlayer(e.target.value)
    })

    if (sortedPlayerOptions.length > 0) {
      displayStatsForPlayer(sortedPlayerOptions[0].id)
    }
  }

  // --- LOGIC / STATE MANAGEMENT FUNCTIONS ---

  function handleCellClick(event) {
    // Handle starting the game on first move
    if (gameState.currentView === "reorder") {
      // Only the new Player 1 can start the game with a move
      if (gameState.currentPlayer === 0) {
        initGame(false) // This locks the order and sets the view to 'game'
      } else {
        return // It's not Player 1's turn to start, so do nothing
      }
    }

    if (!isOrderLocked) return
    const cell = event.target.closest(".cell")
    if (!cell) return
    const index = parseInt(cell.dataset.index)
    if (gameState.board[index] !== null) return

    // Speak the word in the cell
    if (gameState.pronounceWords) {
      speak(cell.textContent)
    }

    const wasBlock = checkForBlock(index)
    if (wasBlock) {
      gameState.playerStatsThisGame[gameState.currentPlayer].blocks++
    }
    const move = {
      index: index,
      player: gameState.currentPlayer,
      scoredLines: [],
    }
    const newBoard = [...gameState.board]
    newBoard[index] = gameState.currentPlayer

    const { pointsScored, shouldEndGame } = checkForWins(move, newBoard)

    const scoreKey = pointsScored.toString()
    const playerGameStats =
      gameState.playerStatsThisGame[gameState.currentPlayer]
    if (pointsScored >= 2) {
      if (pointsScored <= 5) {
        playerGameStats.multiLineScores[scoreKey]++
      } else {
        // Handles scores of 6 or more
        playerGameStats.multiLineScores["6"]++
      }
    }

    if (pointsScored > 0) {
      playSoundSequentially("score", pointsScored)
    } else if (wasBlock) {
      playSound("block")
      cell.classList.add("blocked")
      cell.addEventListener(
        "animationend",
        () => {
          cell.classList.remove("blocked")
        },
        { once: true }
      )
    } else {
      playSound("click")
    }

    const newMoveHistory = [...gameState.moveHistory, move]
    const newMovesMade = gameState.movesMade + 1

    gameState = {
      ...gameState,
      board: newBoard,
      movesMade: newMovesMade,
      moveHistory: newMoveHistory,
    }

    render()

    if (shouldEndGame) {
      endGame()
    } else if (
      gameState.movesMade ===
      gameState.gridSize * gameState.gridSize
    ) {
      // End the game if the board is full
      endGame()
    } else {
      // Otherwise, find the next active player and continue
      const nextPlayer = getNextPlayerIndex(gameState.currentPlayer)
      gameState = { ...gameState, currentPlayer: nextPlayer }
      // Re-render to update the current player highlight
      renderPlayerInfo()
    }
  }

  function enterReorderMode() {
    const settings = {
      playerNames: gameState.playerNames,
      playerColors: gameState.playerColors,
      playerRadii: gameState.playerRadii,
      numPlayers: gameState.numPlayers,
      gridSize: gameState.gridSize,
      matchLength: gameState.matchLength,
      gameMode: gameState.gameMode,
      selectedUnits: gameState.selectedUnits,
      showLines: gameState.showLines,
      pronounceWords: gameState.pronounceWords,
      isMuted: gameState.isMuted,
    }

    gameBoard
      .querySelectorAll(".strike-through-line")
      .forEach((el) => el.remove())

    gameState = {
      ...settings,
      board: Array(settings.gridSize * settings.gridSize).fill(null),
      scores: Array(settings.numPlayers).fill(0),
      currentPlayer: 0,
      movesMade: 0,
      completedLines: new Set(),
      moveHistory: [],
      highlightedCells: new Set(),
      winLinesToDraw: [],
      eliminatedPlayers: [],
      playerStatsThisGame: Array(settings.numPlayers)
        .fill(null)
        .map(() => ({
          blocks: 0,
          multiLineScores: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        })),
      currentView: "reorder",
    }

    isOrderLocked = false

    addGameEventListeners()
    render()
  }

  function undoLastMove() {
    if (gameState.moveHistory.length === 0) return

    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1]

    // Revert all state properties based on the last move
    const newBoard = [...gameState.board]
    newBoard[lastMove.index] = null

    let newScores = [...gameState.scores]
    let newCompletedLines = new Set(gameState.completedLines)
    let newHighlightedCells = new Set(gameState.highlightedCells)
    let newWinLinesToDraw = [...gameState.winLinesToDraw]

    if (lastMove.scoredLines.length > 0) {
      newScores[lastMove.player] -= lastMove.scoredLines.length

      const remainingLines = Array.from(newCompletedLines).filter(
        (lineId) => !lastMove.scoredLines.includes(lineId)
      )
      newCompletedLines = new Set(remainingLines)

      newHighlightedCells.clear()
      remainingLines.forEach((lineId) => {
        const indices = lineId.split(",").map(Number)
        indices.forEach((index) => newHighlightedCells.add(index))
      })

      const lastMoveLineIds = new Set(
        lastMove.scoredLines.map(
          (lineId) =>
            `line-${lineId.split(",")[0]}-${
              lineId.split(",")[lineId.split(",").length - 1]
            }`
        )
      )

      newWinLinesToDraw = newWinLinesToDraw.filter(
        (line) => !lastMoveLineIds.has(line.id)
      )
    }

    // Set the new, reverted state
    gameState = {
      ...gameState,
      board: newBoard,
      scores: newScores,
      completedLines: newCompletedLines,
      highlightedCells: newHighlightedCells,
      winLinesToDraw: newWinLinesToDraw,
      movesMade: gameState.movesMade - 1,
      currentPlayer: lastMove.player,
      moveHistory: gameState.moveHistory.slice(0, -1),
    }

    render() // Re-render after state change
  }

  function applyWinningLines(lines, scoringPlayer) {
    const {
      scores,
      completedLines,
      highlightedCells,
      winLinesToDraw,
      playerColors,
    } = gameState

    const newScores = [...scores]
    const newCompletedLines = new Set(completedLines)
    const newHighlightedCells = new Set(highlightedCells)
    const newWinLinesToDraw = [...winLinesToDraw]

    newScores[scoringPlayer] += lines.length

    lines.forEach((line) => {
      const lineId = lineToString(line)
      newCompletedLines.add(lineId)

      line.forEach((cellIndex) => {
        newHighlightedCells.add(cellIndex)

        const cellToPulse = gameBoard.querySelector(
          `[data-index='${cellIndex}']`
        )
        if (cellToPulse) {
          cellToPulse.classList.remove("pulse")
          void cellToPulse.offsetWidth
          cellToPulse.classList.add("pulse")
        }
      })

      if (gameState.showLines) {
        const sortedLine = [...line].sort((a, b) => a - b)
        newWinLinesToDraw.push({
          id: `line-${sortedLine[0]}-${sortedLine[sortedLine.length - 1]}`,
          start: sortedLine[0],
          end: sortedLine[sortedLine.length - 1],
          color: playerColors[scoringPlayer],
        })
      }
    })

    // Update the master state object
    gameState = {
      ...gameState,
      scores: newScores,
      completedLines: newCompletedLines,
      highlightedCells: newHighlightedCells,
      winLinesToDraw: newWinLinesToDraw,
    }
  }

  function checkForWins(move, currentBoard) {
    const { currentPlayer, gridSize, matchLength, completedLines, gameMode } =
      gameState
    let newPoints = 0
    let shouldEndGame = false

    const potentialWins = getWinningLines(
      currentBoard,
      currentPlayer,
      gridSize,
      matchLength
    )
    const newWinningLines = potentialWins.filter(
      (line) => !completedLines.has(lineToString(line))
    )

    if (newWinningLines.length > 0) {
      newPoints = newWinningLines.length
      applyWinningLines(newWinningLines, currentPlayer)

      // Add the scoring player to the eliminated list in Survivor mode
      if (
        gameMode === "Survivor" &&
        !gameState.eliminatedPlayers.includes(currentPlayer)
      ) {
        gameState.eliminatedPlayers.push(currentPlayer)
        const activePlayerCount =
          gameState.numPlayers - gameState.eliminatedPlayers.length
        if (activePlayerCount <= 1) {
          shouldEndGame = true
        }
      }

      // End the game immediately in Classic mode
      if (gameMode === "Classic") {
        shouldEndGame = true
      }

      // Update the move history with the scored lines after applying them
      if (move) {
        move.scoredLines.push(...newWinningLines.map(lineToString))
      }
    }
    return { pointsScored: newPoints, shouldEndGame: shouldEndGame }
  }

  function checkForBlock(moveIndex) {
    let wasBlock = false
    const originalPlayer = gameState.currentPlayer
    for (
      let opponentIndex = 0;
      opponentIndex < gameState.numPlayers;
      opponentIndex++
    ) {
      if (opponentIndex === originalPlayer) continue
      const tempBoard = [...gameState.board]
      tempBoard[moveIndex] = opponentIndex
      const potentialWins = getWinningLines(
        tempBoard,
        opponentIndex,
        gameState.gridSize,
        gameState.matchLength
      )
      const newWins = potentialWins.filter(
        (line) => !gameState.completedLines.has(lineToString(line))
      )
      if (newWins.length > 0) {
        wasBlock = true
        break
      }
    }
    return wasBlock
  }

  // --- STATS MANAGEMENT FUNCTIONS ---

  function getStats() {
    try {
      const statsJSON = localStorage.getItem(STATS_KEY)
      // If stats exist, parse them; otherwise, return an empty object.
      return statsJSON ? JSON.parse(statsJSON) : {}
    } catch (error) {
      console.error("Error reading stats from localStorage:", error)
      // If there's a parsing error, return an empty object to prevent a crash.
      return {}
    }
  }

  function saveStats(statsObject) {
    try {
      const statsJSON = JSON.stringify(statsObject)
      localStorage.setItem(STATS_KEY, statsJSON)
    } catch (error) {
      console.error("Error saving stats to localStorage:", error)
    }
  }

  function identifyAndPreparePlayers(playerSetupArray) {
    const stats = getStats()
    const existingPlayers = {}
    // Create a quick lookup map of existing names to their IDs
    for (const id in stats) {
      existingPlayers[stats[id].name] = id
    }

    const identifiedPlayers = playerSetupArray.map((player) => {
      const existingId = existingPlayers[player.name]
      if (existingId) {
        // This is a returning player, use their existing ID
        return { ...player, id: existingId }
      } else {
        // This is a new player, generate a new unique ID
        const newId = Date.now().toString() + Math.random().toString().slice(2)
        return { ...player, id: newId }
      }
    })

    return identifiedPlayers
  }

  function updatePlayerStats(finalGameState, winnerIds) {
    const stats = getStats()
    const { players, scores, gameMode, gridSize, matchLength, moveHistory } =
      finalGameState

    const loserIds = players
      .map((p) => p.id)
      .filter((id) => !winnerIds.includes(id))

    players.forEach((player, index) => {
      const playerId = player.id
      const isWinner = winnerIds.includes(playerId)

      // Initialize a new player if they don't exist in the stats object
      if (!stats[playerId]) {
        stats[playerId] = {
          name: player.name,
          gamesPlayed: 0,
          wins: 0,
          currentWinStreak: 0,
          longestWinStreak: 0,
          nemesis: {},
          modes: {
            conquest: {
              gamesPlayed: 0,
              wins: 0,
              totalBlocks: 0,
              multiLineScoreCounts: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
              configs: {},
            },
            stealth: {
              gamesPlayed: 0,
              wins: 0,
              perfectStealthGames: 0,
              configs: {},
            },
            classic: {
              gamesPlayed: 0,
              wins: 0,
              totalBlocks: 0,
              quickestWin: null,
              totalTurnsToWin: 0,
              gamesWonForAvg: 0,
            },
            survivor: {
              gamesPlayed: 0,
              wins: 0,
              totalBlocks: 0,
              totalSurvivalRank: 0,
              gamesFinished: 0,
            },
          },
        }
      }

      // --- Update Overall Stats ---
      stats[playerId].name = player.name // Keep name updated
      stats[playerId].gamesPlayed++
      if (isWinner) {
        stats[playerId].wins++
        stats[playerId].currentWinStreak++
        if (
          stats[playerId].currentWinStreak > stats[playerId].longestWinStreak
        ) {
          stats[playerId].longestWinStreak = stats[playerId].currentWinStreak
        }
        // Update nemesis count for all losers
        loserIds.forEach((loserId) => {
          const winnerName = stats[playerId].name
          if (stats[loserId]) {
            // Ensure loser exists
            stats[loserId].nemesis[winnerName] =
              (stats[loserId].nemesis[winnerName] || 0) + 1
          }
        })
      } else {
        stats[playerId].currentWinStreak = 0
      }

      // --- Update Mode-Specific Stats ---
      const modeStats = stats[playerId].modes[gameMode.toLowerCase()]
      modeStats.gamesPlayed++
      if (isWinner) modeStats.wins++

      const playerGameStats = finalGameState.playerStatsThisGame[index]
      if (playerGameStats) {
        // Safety check
        if (modeStats.totalBlocks !== undefined) {
          modeStats.totalBlocks += playerGameStats.blocks
        }
        if (modeStats.multiLineScoreCounts) {
          for (const key in playerGameStats.multiLineScores) {
            if (playerGameStats.multiLineScores[key] > 0) {
              modeStats.multiLineScoreCounts[key] +=
                playerGameStats.multiLineScores[key]
            }
          }
        }
      }
      switch (gameMode) {
        case "Conquest":
        case "Stealth":
          const configKey = `${gridSize}x${gridSize}-${matchLength}`
          if (!modeStats.configs[configKey]) {
            modeStats.configs[configKey] = {
              gamesPlayed: 0,
              totalPoints: 0,
              highScore: 0,
              bestScore: null,
            }
          }
          const configStats = modeStats.configs[configKey]
          configStats.gamesPlayed++
          configStats.totalPoints += scores[index]
          if (scores[index] > configStats.highScore)
            configStats.highScore = scores[index]
          if (
            configStats.bestScore === null ||
            scores[index] < configStats.bestScore
          )
            configStats.bestScore = scores[index]
          if (gameMode === "Stealth" && scores[index] === 0 && isWinner)
            modeStats.perfectStealthGames++
          break
        case "Classic":
          if (isWinner) {
            const turnsToWin = moveHistory.filter(
              (m) => m.player === index
            ).length
            if (
              modeStats.quickestWin === null ||
              turnsToWin < modeStats.quickestWin
            ) {
              modeStats.quickestWin = turnsToWin
            }
            modeStats.totalTurnsToWin += turnsToWin
            modeStats.gamesWonForAvg++
          }
          break
        case "Survivor":
          const rank =
            finalGameState.eliminatedPlayers.indexOf(playerId) + 1 ||
            players.length
          modeStats.totalSurvivalRank += rank
          modeStats.gamesFinished++
          break
      }
    })

    saveStats(stats)
    populatePlayerDatalist() // Refresh datalist with any new players
  }

  // --- UTILITY FUNCTIONS ---

  function getPlayerSets() {
    const setsJSON = localStorage.getItem(PLAYER_SETS_KEY)
    return setsJSON ? JSON.parse(setsJSON) : {}
  }

  function setPlayerSets(sets) {
    localStorage.setItem(PLAYER_SETS_KEY, JSON.stringify(sets))
  }

  function getSavedPlayerNames() {
    const stats = JSON.parse(localStorage.getItem("wordTacToe_stats") || "{}")
    return Object.values(stats)
      .map((player) => player.name)
      .sort()
  }

  function populatePlayerDatalist() {
    const playerNames = getSavedPlayerNames()
    const datalist = document.getElementById("player-list-data")

    // Clear any existing options before adding new ones
    datalist.innerHTML = ""

    playerNames.forEach((name) => {
      const option = document.createElement("option")
      option.value = name
      datalist.appendChild(option)
    })
  }

  function updateGameModeHint(mode) {
    switch (mode) {
      case "Conquest":
        gameModeHint.textContent = "Get the most points."
        break
      case "Stealth":
        gameModeHint.textContent = "Get the fewest points."
        break
      case "Classic":
        gameModeHint.textContent = "The first score wins."
        break
      case "Survivor":
        gameModeHint.textContent = "Get a point and you're out."
        break
      default:
        gameModeHint.textContent = "Get the most points."
    }
  }

  function validatePlayerNames() {
    const nameInputs = Array.from(
      playerNamesContainer.querySelectorAll(".player-name-input")
    )
    const names = nameInputs
      .map((input) => input.value.trim())
      .filter((name) => name !== "")

    const nameCounts = names.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})

    const duplicateNames = new Set(
      Object.keys(nameCounts).filter((name) => nameCounts[name] > 1)
    )
    let hasErrors = false

    nameInputs.forEach((input) => {
      const field = input.closest(".field")
      const currentName = input.value.trim()
      const isDuplicate = duplicateNames.has(currentName) && currentName !== ""
      const isEmpty = currentName === ""

      // Clear previous error states and messages first
      field.classList.remove("error")
      const existingError = field.querySelector(
        ".supporting-text.error-message"
      )
      if (existingError) {
        existingError.remove()
      }

      let errorMessage = ""
      if (isEmpty) {
        errorMessage = "Name cannot be empty."
        hasErrors = true
      } else if (isDuplicate) {
        errorMessage = "This name is already in use."
        hasErrors = true
      }

      if (errorMessage) {
        field.classList.add("error")
        const errorText = document.createElement("span")
        errorText.className = "supporting-text error-message"
        errorText.textContent = errorMessage
        field.appendChild(errorText)
      }
    })

    startGameBtn.disabled = hasErrors
  }

  async function speak(text) {
    // Basic validation for muted audio or very short text
    if (gameState.isMuted) return
    if (text.trim().length <= 1) {
      playSound("click")
      return
    }

    // --- Primary Method: Try ElevenLabs API ---
    // We'll only attempt the API call if a key has been provided by the user.
    if (userApiKey) {
      const availableVoices = englishVoices.filter(
        (voice) => voice.voice_id !== lastVoiceId
      )
      const randomVoice =
        availableVoices[Math.floor(Math.random() * availableVoices.length)]
      lastVoiceId = randomVoice.voice_id
      console.log("Selected Voice Details:", randomVoice)

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${randomVoice.voice_id}`
      const headers = {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": userApiKey,
      }
      const body = JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: 0.85,
        },
      })

      try {
        const response = await fetch(url, { method: "POST", headers, body })

        if (response.ok) {
          // SUCCESS: Play the audio and exit the function.
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          audio.play()
          return // Important: Exit after successful playback.
        }

        // If response was not ok, log the error and proceed to the fallback.
        const errorData = await response.json()
        console.error(
          "ElevenLabs API Error, attempting fallback:",
          errorData.detail?.message
        )
      } catch (error) {
        console.error(
          "Failed to fetch from ElevenLabs, attempting fallback:",
          error
        )
      }
    }

    // --- Fallback Method: Browser Speech Synthesis ---
    // This code will only run if the API key is missing or if the API call failed.
    speakWithBrowser(text)
  }

  function speakWithBrowser(text) {
    if (!("speechSynthesis" in window)) {
      console.warn("Browser speech synthesis not supported.")
      return
    }

    // Cancel any previously queued speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-US"
    utterance.rate = 0.7
    utterance.pitch = 1.0

    window.speechSynthesis.speak(utterance)
  }

  function getNextPlayerIndex(currentPlayerIndex) {
    const { numPlayers, eliminatedPlayers } = gameState
    let nextPlayer = (currentPlayerIndex + 1) % numPlayers

    // Keep looping until we find a player who is NOT eliminated
    while (eliminatedPlayers.includes(nextPlayer)) {
      nextPlayer = (nextPlayer + 1) % numPlayers
      // Safeguard against infinite loops if all players are eliminated
      if (nextPlayer === currentPlayerIndex) return -1
    }
    return nextPlayer
  }

  function playSound(soundName) {
    if (gameState.isMuted) return
    const audio = sounds[soundName]
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((e) => console.error(`Could not play sound: ${e}`))
    }
  }

  async function playSoundSequentially(soundName, times) {
    if (gameState.isMuted) return
    const audio = sounds[soundName]
    if (!audio) return
    for (let i = 0; i < times; i++) {
      await new Promise((resolve) => {
        audio.currentTime = 0
        audio.onended = () => resolve()
        audio.play().catch((e) => {
          console.error(`Could not play sound: ${e}`)
          resolve()
        })
      })
    }
  }

  function lineToString(line) {
    return [...line].sort((a, b) => a - b).join(",")
  }

  function getWinningLines(board, player, gridSize, matchLength) {
    const newWins = []
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (c <= gridSize - matchLength) {
          const line = Array.from(
            { length: matchLength },
            (_, i) => r * gridSize + c + i
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
        if (r <= gridSize - matchLength) {
          const line = Array.from(
            { length: matchLength },
            (_, i) => (r + i) * gridSize + c
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
        if (r <= gridSize - matchLength && c <= gridSize - matchLength) {
          const line = Array.from(
            { length: matchLength },
            (_, i) => (r + i) * gridSize + (c + i)
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
        if (r <= gridSize - matchLength && c >= matchLength - 1) {
          const line = Array.from(
            { length: matchLength },
            (_, i) => (r + i) * gridSize + (c - i)
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
      }
    }
    return newWins
  }

  function drawLine(startCell, endCell, color) {
    const gameBoard = document.getElementById("game-board")
    const boardRect = gameBoard.getBoundingClientRect()
    const startRect = startCell.getBoundingClientRect()
    const endRect = endCell.getBoundingClientRect()

    const line = document.createElement("div")
    line.classList.add("strike-through-line")
    line.style.backgroundColor = color

    const startX = startRect.left + startRect.width / 2 - boardRect.left
    const startY = startRect.top + startRect.height / 2 - boardRect.top
    const endX = endRect.left + endRect.width / 2 - boardRect.left
    const endY = endRect.top + endRect.height / 2 - boardRect.top

    const length = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    )
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI)

    line.style.width = `${length}px`
    line.style.left = `${startX}px`
    line.style.top = `${startY}px`
    line.style.transform = `rotate(${angle}deg)`

    // Use a slight delay to ensure the line appears after the state has been updated
    setTimeout(() => {
      gameBoard.appendChild(line)
      line.style.width = `${length}px` // Re-apply for transition
      line.style.opacity = "1"
    }, 50)

    return line
  }

  function generatePlayerColors() {
    const selectedTheme = themeHueSelect.value

    if (selectedTheme === "bw") {
      // In B&W mode, use specific, vibrant colors for players.
      return [
        // "var(--red)",
        // "var(--blue)",
        // "var(--green)",
        // "var(--orange)",
        // "var(--purple)",
        "oklch(.71 0.1691 139.84)",
        "oklch(.71 0.1691 67.84)",
        "oklch(.71 0.1691 211.84)",
        "oklch(.71 0.1691 283.84)",
        "oklch(.71 0.1691 355.84)",
      ]
    } else {
      const colors = []
      const maxPlayers = parseInt(document.getElementById("numPlayers").max)

      const rawValue = themeHueSelect.value // Get the raw value, e.g. "var(--oklch-indigo)"
      const themeHuePropName = rawValue.slice(4, -1) // Extract the CSS variable name, e.g. "--oklch-indigo"
      const themeHueStringValue = getComputedStyle(
        document.documentElement
      ).getPropertyValue(themeHuePropName) // Look up the value of the clean property name.
      const selectedHue = parseFloat(themeHueStringValue) // Convert to a number

      const contrastOffset = 180 // Start with the complementary color.
      const hueStep = 360 / maxPlayers // Space colors evenly around the wheel.

      for (let i = 0; i < maxPlayers; i++) {
        const hue = (selectedHue + contrastOffset + i * hueStep) % 360
        const color = `oklch(from var(--color-6) l c ${hue.toFixed(2)})`
        colors.push(color)
      }

      return colors
    }
  }

  function saveSettings() {
    const settingsToSave = {
      numPlayers: numPlayersInput.value,
      playerNames: gameState.setup.players,
      gridSize: gridSizeInput.value,
      matchLength: matchLengthInput.value,
      showLines: showLinesToggle.checked,
      muteSounds: muteSoundsToggle.checked,
      pronounceWords: pronounceWordsToggle.checked,
      gameMode: document.querySelector("#gameModeSelector button.selected")
        ?.dataset.mode,
      selectedUnits: Array.from(
        document.querySelectorAll(".phonics-unit-select")
      ).map((select) => select.value),
      darkMode: darkModeToggle.checked,
      themeHue: themeHueSelect.value,
    }

    localStorage.setItem(
      "phonics_game_settings",
      JSON.stringify(settingsToSave)
    )
  }

  function loadSettings() {
    const savedSettings = localStorage.getItem("phonics_game_settings")

    if (savedSettings) {
      const settings = JSON.parse(savedSettings)

      // Apply saved settings to the inputs
      numPlayersInput.value = settings.numPlayers || 2
      gameState.setup.players = settings.playerNames || []
      gridSizeInput.value = settings.gridSize || 3
      matchLengthInput.value = settings.matchLength || 3
      showLinesToggle.checked = settings.showLines !== false
      muteSoundsToggle.checked = settings.muteSounds === true
      pronounceWordsToggle.checked = settings.pronounceWords === true
      darkModeToggle.checked = settings.darkMode === true
      themeHueSelect.value = settings.themeHue || "var(--oklch-indigo)"

      // Set the correct game mode button
      if (settings.gameMode) {
        gameModeSelector.querySelectorAll("button").forEach((button) => {
          button.classList.toggle(
            "selected",
            button.dataset.mode === settings.gameMode
          )
        })
        updateGameModeHint(settings.gameMode)
      }

      // Re-create the saved word unit selectors
      unitSelectorsContainer.innerHTML = "" // Clear defaults
      if (settings.selectedUnits && settings.selectedUnits.length > 0) {
        settings.selectedUnits.forEach((unitValue) => {
          createUnitSelector(unitValue) // We'll modify createUnitSelector to accept a value
        })
      } else {
        createUnitSelector() // Create one default selector if none were saved
        selectRandomUnit()
      }
    } else {
      // --- IF NO SETTINGS ARE FOUND (NEW USER), CREATE DEFAULTS ---
      createUnitSelector()
      selectRandomUnit()
    }

    // Refresh the entire UI to reflect the loaded settings
    updateTheme()
    renderNameInputs()
    syncSliders()
    updateUnitSelectorsState()
    updateApiFieldVisibility()
    populatePlayerDatalist()
  }

  // --- UNIFIED THEME LOGIC ---

  const darkModeToggle = document.getElementById("darkModeToggle")
  const themeHueSelect = document.getElementById("themeHueSelect")
  const htmlElement = document.documentElement

  function updateTheme() {
    const isDarkMode = darkModeToggle.checked
    const selectedTheme = themeHueSelect.value

    // Handle Dark/Light mode class
    if (isDarkMode) {
      htmlElement.classList.remove("light")
      htmlElement.classList.add("dark")
    } else {
      htmlElement.classList.remove("dark")
      htmlElement.classList.add("light")
    }

    // Handle Color/B&W mode class
    if (selectedTheme === "bw") {
      htmlElement.classList.add("theme-bw")
      htmlElement.style.removeProperty("--palette-hue")
    } else {
      htmlElement.classList.remove("theme-bw")
      htmlElement.style.setProperty("--palette-hue", selectedTheme)
    }
  }

  // Set the initial theme based on system preference and default dropdown value
  darkModeToggle.checked = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
  updateTheme()

  // Add listeners that call the single update function
  darkModeToggle.addEventListener("change", () => {
    updateTheme()
    // saveSettings()
  })

  themeHueSelect.addEventListener("change", () => {
    updateTheme()
    // saveSettings()
  })

  // --- SETUP PHASE FUNCTIONS (Imperative, run before game starts) ---

  function initGame(isFromSetup) {
    // Clear any lingering pulse animations from the previous game
    gameBoard.querySelectorAll(".cell.pulse").forEach((cell) => {
      cell.classList.remove("pulse")
    })

    let settings = {}

    if (isFromSetup) {
      // This block runs ONLY when you click "Start Game" from the main setup screen.
      // It reads all the values directly from the DOM inputs.

      // Identify players, assigning existing IDs or creating new ones
      const preparedPlayers = identifyAndPreparePlayers(gameState.setup.players)
      settings.players = preparedPlayers // Store the full player objects (id, name)
      settings.playerNames = preparedPlayers.map((p) => p.name)

      settings.numPlayers = parseInt(numPlayersInput.value)
      settings.gridSize = parseInt(gridSizeInput.value)
      settings.matchLength = parseInt(matchLengthInput.value)
      settings.gameMode = document.querySelector(
        "#gameModeSelector button.selected"
      ).dataset.mode
      settings.selectedUnits = [
        ...document.querySelectorAll(".phonics-unit-select"),
      ]
        .map((select) => select.value)
        .filter((value) => value)

      if (settings.selectedUnits.length === 0) {
        alert("Please select at least one word unit to start the game.")
        return
      }

      const dynamicColorPalette = generatePlayerColors()
      const shuffledColors = [...dynamicColorPalette].sort(
        () => 0.5 - Math.random()
      )
      settings.playerColors = shuffledColors.slice(0, settings.numPlayers)

      const shuffledRadii = [...playerRadii].sort(() => 0.5 - Math.random())
      settings.playerRadii = shuffledRadii.slice(0, settings.numPlayers)

      settings.showLines = showLinesToggle.checked
      settings.pronounceWords = pronounceWordsToggle.checked

      // The initial gameState is built entirely from the setup screen settings.
      gameState = { ...gameState, ...settings }

      wordCache = getCombinedWords(
        gameState.selectedUnits,
        gameState.gridSize * gameState.gridSize
      )
    }

    // This part runs for BOTH a new game from setup AND a reset/reordered game.
    // It takes the existing settings (which might have been reordered)
    // and resets the game-specific state properties for a fresh round.

    gameState = {
      ...gameState, // Carries over settings like player order, colors, etc.
      board: Array(gameState.gridSize * gameState.gridSize).fill(null),
      scores: Array(gameState.numPlayers).fill(0),
      currentPlayer: 0,
      movesMade: 0,
      completedLines: new Set(),
      moveHistory: [],
      highlightedCells: new Set(),
      winLinesToDraw: [],
      eliminatedPlayers: [],
      playerStatsThisGame: Array(gameState.numPlayers)
        .fill(null)
        .map(() => ({
          blocks: 0,
          multiLineScores: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        })),
      currentView: "game", // The game is now officially active
    }

    isOrderLocked = true // Lock the order and enable cell clicks

    addGameEventListeners()
    render() // Render the final game state
  }

  function handleRandomizeGameMode() {
    const modeButtons = gameModeSelector.querySelectorAll("button")
    const currentSelectedBtn = gameModeSelector.querySelector("button.selected")
    const currentMode = currentSelectedBtn
      ? currentSelectedBtn.dataset.mode
      : null

    // Create a list of all modes EXCEPT the current one
    const availableModes = Array.from(modeButtons)
      .map((btn) => btn.dataset.mode)
      .filter((mode) => mode !== currentMode)

    // If there are no other modes to choose from, do nothing.
    if (availableModes.length === 0) return

    // Select a new random mode from the filtered list
    const newMode =
      availableModes[Math.floor(Math.random() * availableModes.length)]

    // Update the UI to reflect the new choice
    modeButtons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.mode === newMode)
    })

    updateGameModeHint(newMode)
    saveSettings()
    playSound("click")
  }

  function handleRemoveAllUnits() {
    unitSelectorsContainer.innerHTML = "" // Clear all selectors
    createUnitSelector("", true) // Add a single, blank one back
    saveSettings()
  }

  function getCombinedWords(selectedUnits, totalWordsNeeded) {
    const finalWords = []
    const uniqueUnits = [...new Set(selectedUnits)]
    const wordsPerUnit = Math.floor(totalWordsNeeded / uniqueUnits.length)
    let remainder = totalWordsNeeded % uniqueUnits.length
    uniqueUnits.forEach((unitValue) => {
      const [level, unit] = unitValue.split("|")
      const unitData = smartPhonicsWordBank[level][unit]
      const wordPool = [...unitData.words]
      const targetSound = unitData.targetSound
      let wordsToTake = wordsPerUnit
      if (remainder > 0) {
        wordsToTake++
        remainder--
      }
      if (wordPool.length === 0) return
      for (let i = 0; i < wordsToTake; i++) {
        const word = wordPool[i % wordPool.length]
        finalWords.push({ word, target: targetSound })
      }
    })
    for (let i = finalWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[finalWords[i], finalWords[j]] = [finalWords[j], finalWords[i]]
    }
    return finalWords
  }

  function randomizePlayerOrder() {
    if (gameState.setup.players.length < 2) return
    const originalOrderJSON = JSON.stringify(gameState.setup.players)
    let attempts = 0
    do {
      const playersToShuffle = [...gameState.setup.players] // Create a mutable copy
      for (let i = playersToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[playersToShuffle[i], playersToShuffle[j]] = [
          playersToShuffle[j],
          playersToShuffle[i],
        ]
      }
      // Now, update the actual state with the shuffled copy
      gameState = {
        ...gameState,
        setup: {
          ...gameState.setup,
          players: playersToShuffle,
        },
      }
      attempts++
    } while (
      JSON.stringify(gameState.setup.players) === originalOrderJSON &&
      attempts < 10
    )
    renderNameInputs()
  }

  function renderNameInputs() {
    playerNamesContainer.innerHTML = ""
    gameState.setup.players.forEach((player, index) => {
      const field = document.createElement("label")
      field.className = "field player-name-field"
      field.draggable = true
      field.dataset.playerId = player.id
      field.addEventListener("dragstart", () => field.classList.add("dragging"))
      field.addEventListener("dragend", () =>
        field.classList.remove("dragging")
      )
      const label = document.createElement("span")
      label.className = "label"
      label.textContent = `Player ${index + 1} Name`
      const input = document.createElement("input")
      input.type = "text"
      input.className = "player-name-input"
      input.setAttribute("list", "player-list-data")
      input.value = player.name
      input.addEventListener("input", (e) => {
        const playerId = parseInt(field.dataset.playerId)
        gameState = {
          ...gameState,
          setup: {
            ...gameState.setup,
            players: gameState.setup.players.map((p) =>
              p.id === playerId ? { ...p, name: e.target.value } : p
            ),
          },
        }
        saveSettings()
        validatePlayerNames()
      })
      field.appendChild(label)
      field.appendChild(input)
      playerNamesContainer.appendChild(field)
    })
  }

  function createUnitSelector(selectedValue = "", resetToBlank = false) {
    const container = document.createElement("div")
    container.className = "phonics-unit-container"

    const label = document.createElement("label")
    label.className = "field"

    const select = document.createElement("select")
    select.className = "phonics-unit-select"

    const allOptions = []
    const initialOption = document.createElement("option")
    initialOption.value = ""
    initialOption.textContent = "Select a word unit..."
    allOptions.push(initialOption)
    const separator = document.createElement("hr")
    allOptions.push(separator)

    const levelKeys = Object.keys(smartPhonicsWordBank)

    levelKeys.forEach((level, index) => {
      const units = smartPhonicsWordBank[level]
      for (const unit in units) {
        const option = document.createElement("option")
        const unitData = units[unit]
        option.value = `${level}|${unit}`
        option.textContent = `${level.slice(-1)}-${unit.slice(-1)} (${
          unitData.unitTitle
        })`
        allOptions.push(option)
      }

      if (index < levelKeys.length - 1) {
        const separator = document.createElement("hr")
        allOptions.push(separator)
      }
    })

    select.append(...allOptions)

    if (selectedValue) {
      select.value = selectedValue
    } else if (resetToBlank) {
      select.selectedIndex = 0
    } else {
      const allExistingSelectors = unitSelectorsContainer.querySelectorAll(
        ".phonics-unit-select"
      )
      const usedValues = new Set()
      allExistingSelectors.forEach((s) => {
        if (s.value) usedValues.add(s.value)
      })

      let startIndex = 0
      if (allExistingSelectors.length > 0) {
        const lastSelector =
          allExistingSelectors[allExistingSelectors.length - 1]
        if (lastSelector.value) {
          const lastIndexInMasterList = allOptions.findIndex(
            (opt) => opt.value === lastSelector.value
          )
          if (lastIndexInMasterList !== -1) {
            startIndex = lastIndexInMasterList
          }
        }
      }

      let foundNext = false
      for (let i = 1; i < allOptions.length; i++) {
        const potentialIndex = (startIndex + i) % allOptions.length
        const potentialOption = allOptions[potentialIndex]

        if (potentialOption.value && !usedValues.has(potentialOption.value)) {
          select.value = potentialOption.value
          foundNext = true
          break
        }
      }

      if (!foundNext) {
        select.selectedIndex = 0 // Fallback if no options are available
      }
    }

    label.appendChild(select)
    const removeBtn = document.createElement("button")
    removeBtn.className = "icon-button remove-unit-btn"
    removeBtn.setAttribute("aria-label", "Remove unit selector")
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`

    removeBtn.onclick = () => {
      container.remove()
      updateRemoveButtonsVisibility()
      updateUnitSelectorsState()
      saveSettings()
    }

    container.appendChild(label)
    container.appendChild(removeBtn)
    unitSelectorsContainer.appendChild(container)
    updateRemoveButtonsVisibility()
    updateUnitSelectorsState()
  }
  function updateUnitSelectorsState() {
    const allSelectors = document.querySelectorAll(".phonics-unit-select")

    // First, gather all the values that are currently selected.
    const selectedValues = new Set()
    allSelectors.forEach((selector) => {
      if (selector.value) {
        selectedValues.add(selector.value)
      }
    })

    // Now, loop through each selector again to disable/enable its options.
    allSelectors.forEach((selector) => {
      selector.querySelectorAll("option").forEach((option) => {
        // An option should be disabled if...
        // 1. It has a value.
        // 2. That value is in our set of selected values.
        // 3. That value is NOT the value of the CURRENT selector we're looping through.
        const isSelectedElsewhere =
          selectedValues.has(option.value) && selector.value !== option.value
        option.disabled = isSelectedElsewhere
      })
    })
  }

  function updateRemoveButtonsVisibility() {
    const allRemoveButtons =
      unitSelectorsContainer.querySelectorAll(".remove-unit-btn")
    const shouldBeVisible = allRemoveButtons.length > 1

    allRemoveButtons.forEach((btn) => {
      btn.classList.toggle("hidden", !shouldBeVisible)
    })

    removeAllUnitsBtn.classList.toggle("hidden", !shouldBeVisible)
  }

  function syncSliders() {
    const newGridSize = parseInt(gridSizeInput.value, 10)
    gridSizeValue.textContent = `${newGridSize}x${newGridSize}`
    const newMaxMatchLength = Math.min(newGridSize, 5)
    matchLengthInput.max = newMaxMatchLength
    if (parseInt(matchLengthInput.value) > newMaxMatchLength) {
      matchLengthInput.value = newMaxMatchLength
    }
    matchLengthValue.textContent = matchLengthInput.value
  }

  function updateSliderValues() {
    const newCount = parseInt(numPlayersInput.value, 10)
    numPlayersValue.textContent = newCount
    const currentCount = gameState.setup.players.length
    if (newCount > currentCount) {
      const newPlayers = []
      for (let i = currentCount; i < newCount; i++) {
        newPlayers.push({ id: Date.now() + i, name: `Player ${i + 1}` })
      }
      // Create new state object by spreading the new players into the list
      gameState = {
        ...gameState,
        setup: {
          ...gameState.setup,
          players: [...gameState.setup.players, ...newPlayers],
        },
      }
    } else if (newCount < currentCount) {
      // Create new state object by slicing the players list
      gameState = {
        ...gameState,
        setup: {
          ...gameState.setup,
          players: gameState.setup.players.slice(0, newCount),
        },
      }
    }
    renderNameInputs()
    syncSliders()
    validatePlayerNames()
  }

  function selectRandomUnit() {
    const firstSelector = document.querySelector(".phonics-unit-select")
    if (!firstSelector) return
    const options = Array.from(firstSelector.options).filter(
      (opt) => !opt.disabled
    )
    if (options.length > 0) {
      const randomIndex = Math.floor(Math.random() * options.length)
      options[randomIndex].selected = true
    }

    updateRemoveButtonsVisibility()
  }

  function highlightTargetSounds(word, targetSoundString) {
    if (!targetSoundString) {
      return `<span>${word}</span>`
    }
    const targetSounds = targetSoundString.split(",").map((s) => s.trim())
    let resultHTML = ""
    let i = 0
    while (i < word.length) {
      let foundMatch = false
      for (const sound of targetSounds) {
        if (sound.includes("_")) {
          const parts = sound.split("_")
          if (
            i + 2 < word.length &&
            word[i]?.toLowerCase() === parts[0] &&
            word[i + 2]?.toLowerCase() === parts[1]
          ) {
            resultHTML += `<span class="target-sounds">${word[i]}</span>`
            resultHTML += `<span>${word[i + 1]}</span>`
            resultHTML += `<span class="target-sounds">${word[i + 2]}</span>`
            i += 3
            foundMatch = true
            break
          }
        } else if (
          word.substring(i, i + sound.length).toLowerCase() === sound
        ) {
          resultHTML += `<span class="target-sounds">${word.substring(
            i,
            i + sound.length
          )}</span>`
          i += sound.length
          foundMatch = true
          break
        }
      }
      if (!foundMatch) {
        resultHTML += `<span>${word[i]}</span>`
        i++
      }
    }
    return `<span class="word-wrapper">${resultHTML}</span>`
  }

  function determineWinners(finalGameState) {
    const { players, scores, gameMode, eliminatedPlayers } = finalGameState
    let winnerIds = []

    if (gameMode === "Stealth") {
      const minScore = Math.min(...scores)
      players.forEach((p, i) => {
        if (scores[i] === minScore) winnerIds.push(p.id)
      })
    } else if (gameMode === "Survivor") {
      // Find the player whose INDEX is not in the eliminatedPlayers array
      const winner = players.find(
        (p, index) => !eliminatedPlayers.includes(index)
      )
      if (winner) winnerIds.push(winner.id)
    } else {
      // Conquest and Classic
      const maxScore = Math.max(...scores)
      if (maxScore > 0) {
        players.forEach((p, i) => {
          if (scores[i] === maxScore) winnerIds.push(p.id)
        })
      }
    }
    return winnerIds
  }

  function endGame() {
    playSound("gameOver")

    const winnerIds = determineWinners(gameState)
    updatePlayerStats(gameState, winnerIds)

    const dialogTitle = document.getElementById("dialog-title")
    const dialogContent = document.getElementById("dialog-content")

    let winnerText
    if (winnerIds.length === 0) {
      winnerText = "It's a draw!"
    } else if (winnerIds.length > 1) {
      const winnerNames = winnerIds
        .map((id) => gameState.players.find((p) => p.id === id).name)
        .join(" & ")
      winnerText = `It's a tie between: ${winnerNames}!`
    } else {
      const winnerName = gameState.players.find(
        (p) => p.id === winnerIds[0]
      ).name
      winnerText = `${winnerName} wins!`
    }

    if (winnerIds.length > 0) {
      dialogTitle.innerHTML = `Congratulations! 🎉`
    } else {
      dialogTitle.innerHTML = `Game Over`
    }

    let winnerHTML = `<h3 class="h4 winner-text">${winnerText}</h3>`

    const sortedPlayers = gameState.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      score: gameState.scores[index],
      symbol: playerSymbols[index],
    }))

    if (gameState.gameMode === "Stealth") {
      // Sort by lowest score first
      sortedPlayers.sort((a, b) => a.score - b.score)
    } else if (gameState.gameMode === "Survivor") {
      // Sort winners (not eliminated) to the top
      sortedPlayers.sort((a, b) => {
        const aIsWinner = winnerIds.includes(a.id)
        const bIsWinner = winnerIds.includes(b.id)
        if (aIsWinner && !bIsWinner) return -1
        if (!aIsWinner && bIsWinner) return 1
        return 0
      })
    } else {
      // Default: sort by highest score first for Conquest and Classic
      sortedPlayers.sort((a, b) => b.score - a.score)
    }

    let finalScoresHTML = `<div class="score-list">`
    const trophyIcon = "🏆"

    sortedPlayers.forEach((player) => {
      const isWinner = winnerIds.includes(player.id)
      const winnerClass = isWinner ? "winner" : ""
      finalScoresHTML += `
      <div class="score-line ${winnerClass}">
        ${isWinner ? trophyIcon : ""}
        <span>${player.name}: ${player.score}</span>
      </div>
    `
    })

    finalScoresHTML += `</div>`
    dialogContent.innerHTML = winnerHTML + finalScoresHTML

    setTimeout(() => {
      gameDialog.showModal()
    }, 1500)
  }

  function resetSettings() {
    gameState.setup.players = []
    numPlayersInput.value = 2
    gridSizeInput.value = 3
    matchLengthInput.value = 3
    showLinesToggle.checked = true
    muteSoundsToggle.checked = false
    pronounceWordsToggle.checked = false
    updateApiFieldVisibility()

    // Reset theme color dropdown and trigger the change
    // themeHueSelect.value = "var(--oklch-indigo)"
    // themeHueSelect.dispatchEvent(new Event("change"))

    // Reset the game mode to Conquest
    const conquestRadio = document.querySelector(
      'input[name="game_mode"][value="Conquest"]'
    )
    if (conquestRadio) {
      conquestRadio.checked = true
      // Trigger the change event to update the hint text
      conquestRadio.dispatchEvent(new Event("change", { bubbles: true }))
    }

    // Remove all but the first word unit selector
    const allUnitSelectors = unitSelectorsContainer.querySelectorAll(
      ".phonics-unit-container"
    )
    allUnitSelectors.forEach((selector, index) => {
      if (index > 0) {
        selector.remove()
      }
    })

    // Reset the first (or only) word selector to its initial state
    const firstSelector = unitSelectorsContainer.querySelector(
      ".phonics-unit-select"
    )
    if (firstSelector) {
      firstSelector.selectedIndex = 0
    }

    // Call existing functions to update the UI
    updateSliderValues()
    syncSliders()
    updateUnitSelectorsState()
    updateRemoveButtonsVisibility()
  }

  function randomizeTurnOrder() {
    if (gameState.playerNames.length < 2) return // No need to shuffle one player

    // Keep shuffling until the new order is different from the original
    // This is a great way to ensure a noticeable change for the user
    const originalOrderJSON = JSON.stringify(gameState.playerNames)
    let attempts = 0
    do {
      for (let i = gameState.playerNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        // Shuffle names, colors, and radii together to keep them linked
        ;[gameState.playerNames[i], gameState.playerNames[j]] = [
          gameState.playerNames[j],
          gameState.playerNames[i],
        ]
        ;[gameState.playerColors[i], gameState.playerColors[j]] = [
          gameState.playerColors[j],
          gameState.playerColors[i],
        ]
        ;[gameState.playerRadii[i], gameState.playerRadii[j]] = [
          gameState.playerRadii[j],
          gameState.playerRadii[i],
        ]
      }
      attempts++
    } while (
      JSON.stringify(gameState.playerNames) === originalOrderJSON &&
      attempts < 10
    )

    renderPlayerInfo()
  }

  function lockOrderAndStartGame() {
    initGame(true) // Call with 'true' to indicate it's from the setup screen
  }

  function updateApiFieldVisibility() {
    const apiSettingsSection = document.getElementById("api-settings-section")
    if (apiSettingsSection) {
      const isPronunciationOn = pronounceWordsToggle.checked
      // Toggle the entire section's display property
      apiSettingsSection.style.display = isPronunciationOn ? "block" : "none"
    }
  }

  function populateSetsDialog() {
    const sets = getPlayerSets()
    savedSetsList.innerHTML = "" // Clear the current list

    if (Object.keys(sets).length === 0) {
      savedSetsList.innerHTML = '<p class="field-hint">No saved lists yet.</p>'
      return
    }

    for (const setName in sets) {
      const setItem = document.createElement("div")
      setItem.className = "saved-set-item"

      const nameEl = document.createElement("span")
      nameEl.textContent = setName

      const actionsEl = document.createElement("div")
      actionsEl.className = "button-group"

      const loadBtn = document.createElement("button")
      loadBtn.textContent = "Load"
      loadBtn.className = "button tonal small"
      loadBtn.onclick = () => handleLoadSet(setName)

      const deleteBtn = document.createElement("button")
      deleteBtn.textContent = "Delete"
      deleteBtn.className = "button outlined small"
      deleteBtn.onclick = () => handleDeleteSet(setName)

      actionsEl.appendChild(loadBtn)
      actionsEl.appendChild(deleteBtn)
      setItem.appendChild(nameEl)
      setItem.appendChild(actionsEl)
      savedSetsList.appendChild(setItem)
    }
  }

  function handleSaveSet() {
    const setName = saveSetNameInput.value.trim()
    if (!setName) {
      alert("Please enter a name for the list.")
      return
    }

    const currentPlayerNames = gameState.setup.players.map((p) => p.name)
    if (currentPlayerNames.length === 0) {
      alert("Please add players before saving a list.")
      return
    }

    const sets = getPlayerSets()
    sets[setName] = currentPlayerNames
    setPlayerSets(sets)

    saveSetNameInput.value = "" // Clear the input
    populateSetsDialog() // Refresh the list
  }

  function handleLoadSet(setName) {
    const sets = getPlayerSets()
    const playerNames = sets[setName]

    if (!playerNames) return

    // Create the player object structure for the game state
    const newPlayers = playerNames.map((name, index) => ({
      id: Date.now() + index,
      name: name,
    }))

    gameState = {
      ...gameState,
      setup: { ...gameState.setup, players: newPlayers },
    }

    numPlayersInput.value = playerNames.length // Update slider

    updateSliderValues() // This will re-render the name inputs
    playerSetsDialog.close()
    validatePlayerNames()
  }

  function handleDeleteSet(setName) {
    if (!confirm(`Are you sure you want to delete the list "${setName}"?`)) {
      return
    }
    const sets = getPlayerSets()
    delete sets[setName]
    setPlayerSets(sets)
    populateSetsDialog() // Refresh the list
  }

  // --- INITIALIZE and ATTACH LISTENERS ---

  showStatsBtn.addEventListener("click", () => {
    gameState.currentView = "stats"
    render()
  })

  backToSetupBtn.addEventListener("click", () => {
    gameState.currentView = "setup"
    render()
  })

  resetSettingsBtn.addEventListener("click", resetSettings)
  addUnitBtn.addEventListener("click", () => {
    createUnitSelector()
    saveSettings() // Add this
  })
  removeAllUnitsBtn.addEventListener("click", handleRemoveAllUnits)
  startGameBtn.addEventListener("click", () => initGame(true))
  randomizeOrderBtn.addEventListener("click", randomizePlayerOrder)
  showLinesToggle.addEventListener("change", saveSettings)
  pronounceWordsToggle.addEventListener("change", () => {
    updateApiFieldVisibility()
    saveSettings()
  })
  muteSoundsToggle.addEventListener("change", () => {
    gameState = { ...gameState, isMuted: muteSoundsToggle.checked }
    saveSettings()
  })
  numPlayersInput.addEventListener("input", () => {
    updateSliderValues()
    saveSettings()
  })
  gridSizeInput.addEventListener("input", () => {
    syncSliders()
    saveSettings()
  })
  matchLengthInput.addEventListener("input", () => {
    matchLengthValue.textContent = matchLengthInput.value
    saveSettings()
  })

  randomizeGameModeBtn.addEventListener("click", handleRandomizeGameMode)

  gameModeSelector.addEventListener("click", (e) => {
    const clickedButton = e.target.closest("button")
    if (!clickedButton) return

    const gameMode = clickedButton.dataset.mode
    updateGameModeHint(gameMode) // Use the new function

    // Update the selected state visually
    const buttons = gameModeSelector.querySelectorAll("button")
    buttons.forEach((button) => {
      button.classList.remove("selected")
    })
    clickedButton.classList.add("selected")

    saveSettings()
  })

  unitSelectorsContainer.addEventListener("change", (e) => {
    if (e.target.classList.contains("phonics-unit-select")) {
      updateUnitSelectorsState()
      saveSettings()
    }
  })

  playerNamesContainer.addEventListener("dragover", (e) => {
    e.preventDefault()
    const draggingEl = playerNamesContainer.querySelector(".dragging")
    const targetEl = e.target.closest(".player-name-field")

    // Clear previous highlights from all other fields
    playerNamesContainer.querySelectorAll(".drop-target").forEach((el) => {
      el.classList.remove("drop-target")
    })

    // Add highlight to the field we are currently over
    if (targetEl && targetEl !== draggingEl) {
      targetEl.classList.add("drop-target")
    }
  })

  playerNamesContainer.addEventListener("drop", (e) => {
    e.preventDefault()
    const draggingEl = playerNamesContainer.querySelector(".dragging")
    const dropTarget = playerNamesContainer.querySelector(".drop-target")

    // If we aren't dropping on a valid target, cancel the drop
    if (!draggingEl || !dropTarget) {
      if (dropTarget) dropTarget.classList.remove("drop-target")
      return
    }

    dropTarget.classList.remove("drop-target")

    const fromId = parseInt(draggingEl.dataset.playerId)
    const toId = parseInt(dropTarget.dataset.playerId)

    if (fromId === toId) return // Dropped on itself

    const fromIndex = gameState.setup.players.findIndex((p) => p.id === fromId)
    const toIndex = gameState.setup.players.findIndex((p) => p.id === toId)

    const newPlayers = [...gameState.setup.players]
    const [itemToMove] = newPlayers.splice(fromIndex, 1)
    newPlayers.splice(toIndex, 0, itemToMove)

    gameState = {
      ...gameState,
      setup: {
        ...gameState.setup,
        players: newPlayers,
      },
    }
    // Re-render the inputs with the new order
    renderNameInputs()
  })

  manageSetsBtn.addEventListener("click", () => {
    populateSetsDialog()
    playerSetsDialog.showModal()
  })

  closeSetsDialogBtn.addEventListener("click", () => {
    playerSetsDialog.close()
  })

  saveSetBtn.addEventListener("click", handleSaveSet)

  // --- EVENT LISTENERS for between rounds player order setup ---

  const randomizeOrderBtn_game = document.getElementById(
    "randomizeOrderBtn_game"
  )
  const startGameBtn_game = document.getElementById("startGameBtn_game")

  randomizeOrderBtn_game.addEventListener("click", randomizeTurnOrder)
  startGameBtn_game.addEventListener("click", () => initGame(false))

  const handleDragStart = (e) => {
    if (isOrderLocked) return
    e.target.classList.add("dragging")
    e.dataTransfer.setData("text/plain", e.target.dataset.index)
  }
  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging")
  }

  // Re-wire drag and drop to the player info list
  playerInfoList.addEventListener("dragover", (e) => {
    // Can't reorder if the game is locked/in progress
    if (isOrderLocked) return
    e.preventDefault()

    const draggingEl = playerInfoList.querySelector(
      ".player-info-block.dragging"
    )
    const targetEl = e.target.closest(".player-info-block")

    // Clear previous highlights from all other cards
    playerInfoList.querySelectorAll(".drop-target").forEach((el) => {
      el.classList.remove("drop-target")
    })

    // Add highlight to the card we are currently hovering over
    if (targetEl && targetEl !== draggingEl) {
      targetEl.classList.add("drop-target")
    }
  })

  playerInfoList.addEventListener("drop", (e) => {
    if (isOrderLocked) return
    e.preventDefault()

    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
    const dropTarget = playerInfoList.querySelector(
      ".player-info-block.drop-target"
    )

    // If we aren't dropping on a valid target, cancel the drop
    if (!dropTarget) return

    dropTarget.classList.remove("drop-target")

    const toIndex = Array.from(playerInfoList.children).indexOf(dropTarget)

    // Don't do anything if we are dropping in the same place
    if (fromIndex === toIndex) return

    // Move the items in all three data arrays to keep them synced
    const [nameToMove] = gameState.playerNames.splice(fromIndex, 1)
    const [colorToMove] = gameState.playerColors.splice(fromIndex, 1)
    const [radiusToMove] = gameState.playerRadii.splice(fromIndex, 1)

    gameState.playerNames.splice(toIndex, 0, nameToMove)
    gameState.playerColors.splice(toIndex, 0, colorToMove)
    gameState.playerRadii.splice(toIndex, 0, radiusToMove)

    // Re-render the player info cards to show the final new order
    renderPlayerInfo()
  })

  loadSettings()
  updateSliderValues()
  updateApiFieldVisibility()
})
