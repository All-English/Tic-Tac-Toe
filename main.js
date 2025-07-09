import { smartPhonicsWordBank, playerSymbols } from "./config.js"

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let gameState = {}
  let areGameEventListenersAttached = false
  let playerSetupList = []
  let wordCache = []
  let isMuted = false
  let isOrderLocked = false

  const sounds = {
    click: new Audio("sounds/click.mp3"),
    block: new Audio("sounds/block.mp3"),
    score: new Audio("sounds/score.mp3"),
    gameOver: new Audio("sounds/game-over.mp3"),
  }

  // --- DOM ELEMENTS ---
  const setupView = document.getElementById("game-setup")
  const gameView = document.getElementById("game-view")
  const playerInfoList = document.getElementById("player-info-list")
  const gameBoard = document.getElementById("game-board")
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
  const startGameBtn = document.getElementById("startGameBtn")
  const showLinesToggle = document.getElementById("showLinesToggle")
  const randomizeOrderBtn = document.getElementById("randomizeOrderBtn")
  const gameDialog = document.getElementById("game-over-dialog")
  const muteSoundsToggle = document.getElementById("muteSoundsToggle")

  // --- EVENT HANDLER FUNCTIONS ---
  // We define named handlers so we can remove them later.
  const handleCloseDialog = () => {
    gameDialog.close()
  }
  const handleReset = () => initGame(false)
  const handlePlayAgain = () => {
    gameDialog.close()
    initGame(false)
  }
  const handleKeydown = (e) => {
    if (e.key === "Backspace") {
      undoLastMove()
    }
  }
  const handleBackToSettings = () => {
    gameView.classList.remove("is-active")
    playerInfoList.innerHTML = ""
    gameBoard.innerHTML = ""
    gameState = {}
    setupView.classList.add("is-active")
    // Clean up the listeners when returning to the setup screen.
    removeGameEventListeners()
  }

  // --- EVENT LISTENER MANAGEMENT ---

  function addGameEventListeners() {
    if (areGameEventListenersAttached) return
    const resetGameBtn = document.getElementById("resetGameBtn")
    const backToSettingsBtn = document.getElementById("settings-btn")
    const playAgainBtn = document.getElementById("play-again-btn")
    const closeDialogBtn = document.getElementById("close-dialog-btn")

    resetGameBtn.addEventListener("click", handleReset)
    backToSettingsBtn.addEventListener("click", handleBackToSettings)
    playAgainBtn.addEventListener("click", handlePlayAgain)
    closeDialogBtn.addEventListener("click", handleCloseDialog)
    document.addEventListener("keydown", handleKeydown)

    areGameEventListenersAttached = true
  }

  function removeGameEventListeners() {
    if (!areGameEventListenersAttached) return
    const resetGameBtn = document.getElementById("resetGameBtn")
    const backToSettingsBtn = document.getElementById("settings-btn")
    const playAgainBtn = document.getElementById("play-again-btn")
    const closeDialogBtn = document.getElementById("close-dialog-btn")

    resetGameBtn.removeEventListener("click", handleReset)
    backToSettingsBtn.removeEventListener("click", handleBackToSettings)
    playAgainBtn.removeEventListener("click", handlePlayAgain)
    closeDialogBtn.removeEventListener("click", handleCloseDialog)
    document.removeEventListener("keydown", handleKeydown)

    areGameEventListenersAttached = false
  }

  // --- MAIN RENDER FUNCTION ---

  function render() {
    renderPlayerInfo()
    renderBoard()
    renderWinLines()
  }

  // --- RENDERING SUB-FUNCTIONS ---

  function renderBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`
    if (gameState.gridSize > 8) {
      gameBoard.classList.add("large-grid")
    } else {
      gameBoard.classList.remove("large-grid")
    }

    for (let i = 0; i < gameState.gridSize * gameState.gridSize; i++) {
      let cell = gameBoard.querySelector(`[data-index='${i}']`)
      // If cell doesn't exist, create it once
      if (!cell) {
        cell = document.createElement("button")
        cell.classList.add("button", "cell")
        cell.dataset.index = i
        cell.addEventListener("click", handleCellClick)
        gameBoard.appendChild(cell)
      }

      // ALWAYS update the word content on every render
      const wordObject = wordCache[i] || { word: "?", target: "" }
      cell.innerHTML = highlightTargetSounds(wordObject.word, wordObject.target)

      // Update dynamic properties based on state
      const cellState = gameState.board[i]
      cell.disabled = cellState !== null

      if (cellState !== null) {
        cell.dataset.playerSymbol = playerSymbols[cellState]
        cell.style.setProperty(
          "--player-color",
          gameState.playerColors[cellState]
        )
      } else {
        cell.removeAttribute("data-player-symbol")
        cell.style.removeProperty("--player-color")
      }

      // Declaratively add/remove the highlight class based on state
      if (gameState.highlightedCells.has(i)) {
        cell.classList.add("highlight")
      } else {
        cell.classList.remove("highlight")
      }
    }
  }

  function renderPlayerInfo() {
    const {
      numPlayers,
      scores,
      currentPlayer,
      playerColors,
      playerNames,
      eliminatedPlayers, // Get the new eliminatedPlayers array
    } = gameState

    for (let i = 0; i < numPlayers; i++) {
      const playerBlockId = `player-info-block-${i}`
      let playerBlock = document.getElementById(playerBlockId)
      if (!playerBlock) {
        playerBlock = document.createElement("div")
        playerBlock.id = playerBlockId
        playerBlock.className = "card outlined player-info-block"
        playerInfoList.appendChild(playerBlock)
        playerBlock.innerHTML = `
          <hgroup><h3 class="h6" data-role="name"></h3></hgroup>
          <div class="content" data-role="score"></div>
        `
      }
      const nameHeader = playerBlock.querySelector('[data-role="name"]')
      const scoreDiv = playerBlock.querySelector('[data-role="score"]')
      nameHeader.textContent = `${playerNames[i]} (${playerSymbols[i]})`
      scoreDiv.textContent = `Score: ${scores[i]}`
      playerBlock.style.setProperty("--player-color", playerColors[i])

      // Toggle 'current-player' class
      if (i === currentPlayer) {
        playerBlock.classList.add("current-player")
      } else {
        playerBlock.classList.remove("current-player")
      }

      // --- NEW LOGIC ---
      // Toggle 'eliminated' class
      if (eliminatedPlayers && eliminatedPlayers.includes(i)) {
        playerBlock.classList.add("eliminated")
      } else {
        playerBlock.classList.remove("eliminated")
      }
    }
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

  // --- LOGIC / STATE MANAGEMENT FUNCTIONS ---

  function handleCellClick(event) {
    if (!isOrderLocked) return
    const cell = event.target.closest(".cell")
    if (!cell) return
    const index = parseInt(cell.dataset.index)
    if (gameState.board[index] !== null) return

    const wasBlock = checkForBlock(index)
    const move = {
      index: index,
      player: gameState.currentPlayer,
      scoredLines: [],
    }
    const newBoard = [...gameState.board]
    newBoard[index] = gameState.currentPlayer

    const { pointsScored, shouldEndGame } = checkForWins(move, newBoard)

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

  function checkForWins(move, currentBoard) {
    const {
      currentPlayer,
      gridSize,
      matchLength,
      completedLines,
      playerColors,
      gameMode,
    } = gameState
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
      const scoringPlayer = currentPlayer
      const newScores = [...gameState.scores]
      newScores[scoringPlayer] += newWinningLines.length

      const newCompletedLines = new Set(completedLines)
      const newHighlightedCells = new Set(gameState.highlightedCells)
      const newWinLinesToDraw = [...gameState.winLinesToDraw]

      newWinningLines.forEach((line) => {
        const lineId = lineToString(line)
        newCompletedLines.add(lineId)

        line.forEach((cellIndex) => newHighlightedCells.add(cellIndex))
        if (gameState.showLines) {
          const sortedLine = [...line].sort((a, b) => a - b)
          newWinLinesToDraw.push({
            id: `line-${sortedLine[0]}-${sortedLine[sortedLine.length - 1]}`,
            start: sortedLine[0],
            end: sortedLine[sortedLine.length - 1],
            color: playerColors[scoringPlayer],
          })
        }
        newPoints++
        if (move) {
          move.scoredLines.push(lineId)
        }
      })

      gameState = {
        ...gameState,
        scores: newScores,
        completedLines: newCompletedLines,
        highlightedCells: newHighlightedCells,
        winLinesToDraw: newWinLinesToDraw,
      }

      if (
        gameMode === "Survivor" &&
        !gameState.eliminatedPlayers.includes(currentPlayer)
      ) {
        gameState.eliminatedPlayers.push(currentPlayer)
        const activePlayerCount =
          gameState.numPlayers - gameState.eliminatedPlayers.length
        if (activePlayerCount <= 1) {
          shouldEndGame = true // Set flag to end game
        }
      }

      if (gameMode === "Classic") {
        shouldEndGame = true // Set flag to end game
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

  // --- UTILITY FUNCTIONS ---

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

  function isPlayableMoveAvailable(board, player) {
    const emptyCells = board
      .map((cell, index) => (cell === null ? index : null))
      .filter((index) => index !== null)

    for (const index of emptyCells) {
      const tempBoard = [...board]
      tempBoard[index] = player
      const winningLines = getWinningLines(
        tempBoard,
        player,
        gameState.gridSize,
        gameState.matchLength
      )
      // If we find any move that does NOT create a winning line, a playable move exists.
      if (winningLines.length === 0) {
        return true
      }
    }
    // If we loop through all empty cells and every single one creates a line, no playable moves are left.
    return false
  }

  function playSound(soundName) {
    if (isMuted) return
    const audio = sounds[soundName]
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((e) => console.error(`Could not play sound: ${e}`))
    }
  }

  async function playSoundSequentially(soundName, times) {
    if (isMuted) return
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
    const colors = []
    const selectedTheme = themeHueSelect.value

    if (selectedTheme === "bw") {
      // In B&W mode, use specific, vibrant colors for players.
      return [
        "var(--red)",
        "var(--blue)",
        "var(--green)",
        "var(--orange)",
        "var(--purple)",
      ]
    } else {
      // For color themes, use the hue-shifting logic.
      const initialShift = 45
      const hueShiftAmount = 55
      const maxPlayers = 5

      for (let i = 0; i < maxPlayers; i++) {
        const totalShift = initialShift + i * hueShiftAmount
        const shiftedColor = `oklch(from var(--color-9) l c calc(h + ${totalShift}))`
        colors.push(shiftedColor)
      }
      return colors
    }
  }

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
  darkModeToggle.addEventListener("change", updateTheme)
  themeHueSelect.addEventListener("change", updateTheme)

  // --- SETUP PHASE FUNCTIONS (Imperative, run before game starts) ---

  function initGame(isNewGame) {
    let settings = {}
    if (isNewGame) {
      settings.playerNames = playerSetupList.map((p) => p.name)
      settings.numPlayers = parseInt(numPlayersInput.value)
      settings.gridSize = parseInt(gridSizeInput.value)
      settings.matchLength = parseInt(matchLengthInput.value)
      settings.gameMode = document.querySelector(
        'input[name="game_mode"]:checked'
      ).value
      settings.selectedUnits = [
        ...document.querySelectorAll(".phonics-unit-select"),
      ]
        .map((select) => select.value)
        .filter((value) => value)
      const dynamicColorPalette = generatePlayerColors()
      const shuffledColors = [...dynamicColorPalette].sort(
        () => 0.5 - Math.random()
      )
      settings.playerColors = shuffledColors.slice(0, settings.numPlayers)
      settings.showLines = showLinesToggle.checked
      if (settings.selectedUnits.length === 0) {
        alert("Please select at least one word unit to start the game.")
        return
      }
    } else {
      // For subsequent rounds, let's re-shuffle colors for variety
      const dynamicColorPalette = generatePlayerColors()
      const shuffledColors = [...dynamicColorPalette].sort(
        () => 0.5 - Math.random()
      )
      settings = {
        playerNames: gameState.playerNames,
        numPlayers: gameState.numPlayers,
        gridSize: gameState.gridSize,
        matchLength: gameState.matchLength,
        gameMode: gameState.gameMode,
        selectedUnits: gameState.selectedUnits,
        playerColors: shuffledColors.slice(0, gameState.numPlayers),
        showLines: gameState.showLines,
      }
    }
    gameBoard
      .querySelectorAll(".strike-through-line")
      .forEach((el) => el.remove())

    wordCache = getCombinedWords(
      settings.selectedUnits,
      settings.gridSize * settings.gridSize
    )

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
    }

    if (isNewGame) {
      isOrderLocked = true
      document.getElementById("player-order-setup").classList.add("hidden")
      document.getElementById("player-info-list").classList.remove("hidden")
      document.getElementById("player-order-list").classList.add("locked")
      renderPlayerInfo()
    } else {
      isOrderLocked = false
      document.getElementById("player-order-setup").classList.remove("hidden")
      document.getElementById("player-info-list").classList.add("hidden")
      document.getElementById("player-order-list").classList.remove("locked")
      renderPlayerOrderList()
    }

    setupView.classList.remove("is-active")
    gameView.classList.add("is-active")
    renderBoard()
    addGameEventListeners()
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
    if (playerSetupList.length < 2) return
    const originalOrderJSON = JSON.stringify(playerSetupList)
    let attempts = 0
    do {
      for (let i = playerSetupList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[playerSetupList[i], playerSetupList[j]] = [
          playerSetupList[j],
          playerSetupList[i],
        ]
      }
      attempts++
    } while (
      JSON.stringify(playerSetupList) === originalOrderJSON &&
      attempts < 10
    )
    renderNameInputs()
  }

  function renderNameInputs() {
    playerNamesContainer.innerHTML = ""
    playerSetupList.forEach((player, index) => {
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
      input.value = player.name
      input.addEventListener("input", (e) => {
        const playerId = parseInt(field.dataset.playerId)
        const playerToUpdate = playerSetupList.find((p) => p.id === playerId)
        if (playerToUpdate) {
          playerToUpdate.name = e.target.value
        }
      })
      field.appendChild(label)
      field.appendChild(input)
      playerNamesContainer.appendChild(field)
    })
  }

  function createUnitSelector() {
    const container = document.createElement("div")
    container.className = "phonics-unit-container"
    const label = document.createElement("label")
    label.className = "field"
    const select = document.createElement("select")
    select.className = "phonics-unit-select"
    const initialOption = document.createElement("option")
    initialOption.value = ""
    initialOption.textContent = "Select a word unit..."
    initialOption.disabled = true
    initialOption.selected = true
    select.appendChild(initialOption)
    for (const level in smartPhonicsWordBank) {
      for (const unit in smartPhonicsWordBank[level]) {
        const option = document.createElement("option")
        const unitData = smartPhonicsWordBank[level][unit]
        option.value = `${level}|${unit}`
        option.textContent = `Level ${level.slice(-1)} - ${
          unit.slice(0, 1).toUpperCase() + unit.slice(1)
        }: ${unitData.targetSound}`
        select.appendChild(option)
      }
    }
    label.appendChild(select)
    const removeBtn = document.createElement("button")
    removeBtn.className = "icon-button"
    removeBtn.setAttribute("aria-label", "Remove unit selector")
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    removeBtn.onclick = () => container.remove()
    container.appendChild(label)
    container.appendChild(removeBtn)
    unitSelectorsContainer.appendChild(container)
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
    const currentCount = playerSetupList.length
    if (newCount > currentCount) {
      for (let i = currentCount; i < newCount; i++) {
        playerSetupList.push({ id: Date.now() + i, name: `Player ${i + 1}` })
      }
    } else if (newCount < currentCount) {
      playerSetupList.splice(newCount)
    }
    renderNameInputs()
    syncSliders()
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

  function endGame() {
    playSound("gameOver")
    const dialogTitle = document.getElementById("dialog-title")
    const dialogContent = document.getElementById("dialog-content")

    let winnerText
    let bestScore
    let winners = []

    if (gameState.gameMode === "Survivor") {
      // In Survivor mode, players with ZERO points win.
      winners = gameState.scores
        .map((score, index) => (score === 0 ? index : -1))
        .filter((index) => index !== -1)
    } else if (gameState.gameMode === "Stealth") {
      // In Stealth mode, the lowest score wins
      bestScore = Infinity
      for (let i = 0; i < gameState.numPlayers; i++) {
        if (gameState.scores[i] < bestScore) {
          bestScore = gameState.scores[i]
          winners = [i]
        } else if (gameState.scores[i] === bestScore) {
          winners.push(i)
        }
      }
    } else {
      // In Conquest or Classic mode, the highest score wins
      bestScore = -1
      for (let i = 0; i < gameState.numPlayers; i++) {
        if (gameState.scores[i] > bestScore) {
          bestScore = gameState.scores[i]
          winners = [i]
        } else if (gameState.scores[i] === bestScore && bestScore > 0) {
          winners.push(i)
        }
      }
    }

    if (
      winners.length === 0 ||
      (gameState.gameMode === "Conquest" && bestScore === 0)
    ) {
      winnerText = "No one scored any points! It's a draw."
    } else if (winners.length === gameState.numPlayers) {
      winnerText = "It's a perfect tie!"
    } else if (winners.length > 1) {
      const winnerNames = winners
        .map((i) => gameState.playerNames[i])
        .join(", ")
      winnerText = `It's a tie between: ${winnerNames}!`
    } else {
      winnerText = `${gameState.playerNames[winners[0]]} wins!`
    }

    dialogTitle.innerHTML = `Congratulations! 🎉`
    let winnerHTML = `<h3 class="h4 winner-text">${winnerText}</h3>`

    const sortedPlayers = gameState.playerNames
      .map((name, index) => ({
        name: name,
        score: gameState.scores[index],
        symbol: playerSymbols[index],
        originalIndex: index,
      }))
      .sort((a, b) => b.score - a.score)

    let finalScoresHTML = `<div class="score-list">`
    const trophyIcon = "🏆"

    sortedPlayers.forEach((player) => {
      const isWinner = winners.includes(player.originalIndex)
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
    // Reset sliders and toggles to their default values
    numPlayersInput.value = 2
    gridSizeInput.value = 3
    matchLengthInput.value = 3
    showLinesToggle.checked = true
    muteSoundsToggle.checked = false

    // Reset theme color dropdown and trigger the change
    themeHueSelect.value = "var(--oklch-blue)"
    themeHueSelect.dispatchEvent(new Event("change"))

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
  }
  function renderPlayerOrderList() {
    const container = document.getElementById("player-order-list")
    container.innerHTML = ""
    gameState.playerNames.forEach((name, index) => {
      const item = document.createElement("div")
      item.className = "player-order-item"
      item.textContent = `${index + 1}. ${name}`
      item.draggable = true
      item.dataset.index = index
      item.addEventListener("dragstart", handleDragStart)
      item.addEventListener("dragend", handleDragEnd)
      container.appendChild(item)
    })
  }

  function randomizeTurnOrder() {
    if (gameState.playerNames.length < 2) return // No need to shuffle one player

    const originalOrderJSON = JSON.stringify(gameState.playerNames)
    let attempts = 0

    // Keep shuffling until the new order is different from the original
    // Add a limit of 10 attempts as a safeguard against infinite loops
    do {
      for (let i = gameState.playerNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        // Shuffle both names and their corresponding colors to keep them linked
        ;[gameState.playerNames[i], gameState.playerNames[j]] = [
          gameState.playerNames[j],
          gameState.playerNames[i],
        ]
        ;[gameState.playerColors[i], gameState.playerColors[j]] = [
          gameState.playerColors[j],
          gameState.playerColors[i],
        ]
      }
      attempts++
    } while (
      JSON.stringify(gameState.playerNames) === originalOrderJSON &&
      attempts < 10
    )

    renderPlayerOrderList()
  }

  function lockOrderAndStartGame() {
    isOrderLocked = true
    document.getElementById("player-order-setup").classList.add("hidden")
    document.getElementById("player-info-list").classList.remove("hidden")
    document.getElementById("player-order-list").classList.add("locked")
    renderPlayerInfo() // Render the final order as score cards
  }

  // --- INITIALIZE and ATTACH LISTENERS ---

  const resetSettingsBtn = document.getElementById("resetSettingsBtn")
  resetSettingsBtn.addEventListener("click", resetSettings)
  numPlayersInput.addEventListener("input", updateSliderValues)
  gridSizeInput.addEventListener("input", syncSliders)
  addUnitBtn.addEventListener("click", createUnitSelector)
  startGameBtn.addEventListener("click", () => initGame(true))
  randomizeOrderBtn.addEventListener("click", randomizePlayerOrder)

  muteSoundsToggle.addEventListener("change", () => {
    isMuted = muteSoundsToggle.checked
  })
  matchLengthInput.addEventListener("input", () => {
    matchLengthValue.textContent = matchLengthInput.value
  })

  const gameModeSelector = document.getElementById("gameModeSelector")
  const gameModeHint = document.getElementById("gameModeHint")

  gameModeSelector.addEventListener("change", (e) => {
    if (e.target.name === "game_mode") {
      switch (e.target.value) {
        case "Conquest":
          gameModeHint.textContent = "Get the most points."
          break
        case "Stealth":
          gameModeHint.textContent = "Get the fewest points."
          break
        case "Classic":
          gameModeHint.textContent = "The first score wins."
        case "Survivor":
          gameModeHint.textContent = "Get a point and you're out."
          break
      }
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

    const fromIndex = playerSetupList.findIndex((p) => p.id === fromId)
    const toIndex = playerSetupList.findIndex((p) => p.id === toId)

    // Move the item in the array
    const [itemToMove] = playerSetupList.splice(fromIndex, 1)
    playerSetupList.splice(toIndex, 0, itemToMove)

    // Re-render the inputs with the new order
    renderNameInputs()
  })

  // --- EVENT LISTENERS for between rounds player order setup ---
  const playerOrderList = document.getElementById("player-order-list")
  const randomizeTurnOrderBtn = document.getElementById(
    "randomize-turn-order-btn"
  )
  const lockOrderBtn = document.getElementById("lock-order-btn")

  const handleDragStart = (e) => {
    if (isOrderLocked) return
    e.target.classList.add("dragging")
    e.dataTransfer.setData("text/plain", e.target.dataset.index)
  }
  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging")
  }

  playerOrderList.addEventListener("dragover", (e) => {
    if (isOrderLocked) return
    e.preventDefault()

    const draggingEl = playerOrderList.querySelector(".dragging")
    const targetEl = e.target.closest(".player-order-item")

    // Clear previous highlights
    playerOrderList.querySelectorAll(".drop-target").forEach((el) => {
      el.classList.remove("drop-target")
    })

    // Add highlight to the element we are currently over
    if (targetEl && targetEl !== draggingEl) {
      targetEl.classList.add("drop-target")
    }
  })

  playerOrderList.addEventListener("drop", (e) => {
    if (isOrderLocked) return
    e.preventDefault()

    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
    const dropTarget = playerOrderList.querySelector(".drop-target")

    // If we're not dropping on a valid target, do nothing
    if (!dropTarget) return

    // Clean up the highlight class
    dropTarget.classList.remove("drop-target")

    // Find the target index for the drop
    const toIndex = Array.from(playerOrderList.children).indexOf(dropTarget)

    // Don't do anything if we are dropping in the same place
    if (fromIndex === toIndex) return

    // Move the items in the data arrays
    const [nameToMove] = gameState.playerNames.splice(fromIndex, 1)
    const [colorToMove] = gameState.playerColors.splice(fromIndex, 1)

    // Note: The 'correctedToIndex' logic from before is not needed here
    // because we are inserting relative to the target's position before the move.
    gameState.playerNames.splice(toIndex, 0, nameToMove)
    gameState.playerColors.splice(toIndex, 0, colorToMove)

    // Re-render the list to show the final new order
    renderPlayerOrderList()
  })

  randomizeTurnOrderBtn.addEventListener("click", randomizeTurnOrder)
  lockOrderBtn.addEventListener("click", lockOrderAndStartGame)

  updateSliderValues()
  createUnitSelector()
  selectRandomUnit()
})
