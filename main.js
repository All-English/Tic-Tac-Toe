import { smartPhonicsWordBank, playerSymbols, englishVoices } from "./config.js"

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
  const gameModeHint = document.getElementById("gameModeHint")
  const resetSettingsBtn = document.getElementById("resetSettingsBtn")

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

    renderPlayerInfo()
    renderBoard()

    if (gameState.currentView === "game") {
      renderWinLines()
    }
  }

  function renderViews() {
    const { currentView } = gameState

    setupView.classList.toggle("is-active", currentView === "setup")
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

      // Add drag-and-drop functionality only in reorder mode
      if (isReordering) {
        playerBlock.draggable = true
        playerBlock.addEventListener("dragstart", handleDragStart)
        playerBlock.addEventListener("dragend", handleDragEnd)
      }

      playerBlock.innerHTML = `
      <hgroup><h3 data-role="name">${name} (${playerSymbols[i]})</h3></hgroup>
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
      speak(cell.textContent, isMuted)
    }

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

  // --- UTILITY FUNCTIONS ---

  async function speak(text, isMuted) {
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
    if (!savedSettings) return // No saved settings found

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
    themeHueSelect.value = settings.themeHue || "var(--oklch-blue)"

    // Set the correct game mode button
    if (settings.gameMode) {
      gameModeSelector.querySelectorAll("button").forEach((button) => {
        button.classList.toggle(
          "selected",
          button.dataset.mode === settings.gameMode
        )
      })
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

    // Refresh the entire UI to reflect the loaded settings
    updateTheme()
    renderNameInputs()
    syncSliders()
    updateUnitSelectorsState()
    updateApiFieldVisibility()
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
    let settings = {}

    if (isFromSetup) {
      // This block runs ONLY when you click "Start Game" from the main setup screen.
      // It reads all the values directly from the DOM inputs.
      settings.playerNames = gameState.setup.players.map((p) => p.name)
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
    }

    // This part runs for BOTH a new game from setup AND a reset/reordered game.
    // It takes the existing settings (which might have been reordered)
    // and resets the game-specific state properties for a fresh round.
    wordCache = getCombinedWords(
      gameState.selectedUnits,
      gameState.gridSize * gameState.gridSize
    )

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
      currentView: "game", // The game is now officially active
    }

    isOrderLocked = true // Lock the order and enable cell clicks

    addGameEventListeners()
    render() // Render the final game state
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
      })
      field.appendChild(label)
      field.appendChild(input)
      playerNamesContainer.appendChild(field)
    })
  }

  function createUnitSelector(selectedValue = "") {
    const container = document.createElement("div")
    container.className = "phonics-unit-container"

    const label = document.createElement("label")
    label.className = "field"

    const select = document.createElement("select")
    select.className = "phonics-unit-select"

    // Build the list of all possible options first
    const allOptions = []
    const initialOption = document.createElement("option")
    initialOption.value = ""
    initialOption.textContent = "Select a word unit..."
    allOptions.push(initialOption)

    for (const level in smartPhonicsWordBank) {
      for (const unit in smartPhonicsWordBank[level]) {
        const option = document.createElement("option")
        const unitData = smartPhonicsWordBank[level][unit]
        option.value = `${level}|${unit}`
        option.textContent = `Level ${level.slice(-1)} - ${
          unit.slice(0, 1).toUpperCase() + unit.slice(1)
        }: ${unitData.targetSound}`
        allOptions.push(option)
      }
    }
    select.append(...allOptions)

    // If a value was passed in (from localStorage), set it.
    if (selectedValue) {
      select.value = selectedValue
    } else {
      // If no value is passed, use the original logic to find the next available unit.
      const allSelectors = unitSelectorsContainer.querySelectorAll(
        ".phonics-unit-select"
      )
      if (allSelectors.length > 0) {
        const usedValues = new Set()
        allSelectors.forEach((s) => {
          if (s.value) usedValues.add(s.value)
        })
        const lastSelector = allSelectors[allSelectors.length - 1]
        const lastIndex = lastSelector.selectedIndex
        let foundNext = false
        for (let i = 1; i < allOptions.length; i++) {
          const potentialIndex = (lastIndex + i) % allOptions.length
          const potentialOption = allOptions[potentialIndex]
          if (potentialOption.value && !usedValues.has(potentialOption.value)) {
            select.selectedIndex = potentialIndex
            foundNext = true
            break
          }
        }
        if (!foundNext) {
          select.selectedIndex = 0
        }
      } else {
        select.selectedIndex = 0
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
      ((gameState.gameMode === "Conquest" ||
        gameState.gameMode === "Classic") &&
        bestScore === 0)
    ) {
      winnerText = "No one scored any points. It's a draw!"
      winners = []
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

    if (winners.length > 0) {
      dialogTitle.innerHTML = `Congratulations! 🎉`
    } else {
      dialogTitle.innerHTML = `Game Over`
    }

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
    gameState.setup.players = []
    numPlayersInput.value = 2
    gridSizeInput.value = 3
    matchLengthInput.value = 3
    showLinesToggle.checked = true
    muteSoundsToggle.checked = false
    pronounceWordsToggle.checked = false
    updateApiFieldVisibility()

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

  // --- INITIALIZE and ATTACH LISTENERS ---

  resetSettingsBtn.addEventListener("click", resetSettings)
  addUnitBtn.addEventListener("click", () => {
    createUnitSelector()
    saveSettings() // Add this
  })
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

  gameModeSelector.addEventListener("click", (e) => {
    const clickedButton = e.target.closest("button")
    if (!clickedButton) return

    // Update hint text based on the button's data-mode
    const gameMode = clickedButton.dataset.mode
    switch (gameMode) {
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
    }

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
