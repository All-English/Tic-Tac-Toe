import { smartPhonicsWordBank, playerSymbols, COLOR_PALETTE } from "./config.js"

document.addEventListener("DOMContentLoaded", () => {
  // --- THEME SWITCHER LOGIC ---
  const darkModeToggle = document.getElementById("darkModeToggle")
  const htmlElement = document.documentElement

  const setInitialTheme = () => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
    htmlElement.className = prefersDark ? "dark" : "light"
    darkModeToggle.checked = prefersDark
  }

  const handleThemeChange = (e) => {
    htmlElement.className = e.target.checked ? "dark" : "light"
  }

  darkModeToggle.addEventListener("change", handleThemeChange)
  setInitialTheme() // Set theme on initial load

  // --- STATE ---
  let gameState = {}
  let areGameEventListenersAttached = false
  let playerSetupList = []
  let wordCache = []

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

  // --- EVENT HANDLER FUNCTIONS ---
  // We define named handlers so we can remove them later.
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
    gameView.classList.add("hidden")
    playerInfoList.innerHTML = ""
    gameBoard.innerHTML = ""
    gameState = {}
    setupView.classList.remove("hidden")
    // Clean up the listeners when returning to the setup screen.
    removeGameEventListeners()
  }

  // --- EVENT LISTENER MANAGEMENT ---

  function addGameEventListeners() {
    if (areGameEventListenersAttached) return
    const resetGameBtn = document.getElementById("resetGameBtn")
    const backToSettingsBtn = document.getElementById("settings-btn")
    const playAgainBtn = document.getElementById("play-again-btn")

    resetGameBtn.addEventListener("click", handleReset)
    backToSettingsBtn.addEventListener("click", handleBackToSettings)
    playAgainBtn.addEventListener("click", handlePlayAgain)
    document.addEventListener("keydown", handleKeydown)

    areGameEventListenersAttached = true
  }

  function removeGameEventListeners() {
    if (!areGameEventListenersAttached) return
    const resetGameBtn = document.getElementById("resetGameBtn")
    const backToSettingsBtn = document.getElementById("settings-btn")
    const playAgainBtn = document.getElementById("play-again-btn")

    resetGameBtn.removeEventListener("click", handleReset)
    backToSettingsBtn.removeEventListener("click", handleBackToSettings)
    playAgainBtn.removeEventListener("click", handlePlayAgain)
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
        const wordObject = wordCache[i] || { word: "?", target: "" }
        cell.innerHTML = highlightTargetSounds(
          wordObject.word,
          wordObject.target
        )
        cell.addEventListener("click", handleCellClick)
        gameBoard.appendChild(cell)
      }

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
    const { numPlayers, scores, currentPlayer, playerColors, playerNames } =
      gameState
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
      if (i === currentPlayer) {
        playerBlock.classList.add("current-player")
      } else {
        playerBlock.classList.remove("current-player")
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

    const pointsScored = checkForWins(move, newBoard)

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
    let nextPlayer = (gameState.currentPlayer + 1) % gameState.numPlayers

    gameState = {
      ...gameState,
      board: newBoard, // Use the new board from this move
      movesMade: newMovesMade,
      moveHistory: newMoveHistory,
    }

    if (gameState.movesMade === gameState.gridSize * gameState.gridSize) {
      endGame()
    } else {
      gameState = { ...gameState, currentPlayer: nextPlayer }
      render() // Single call to re-render UI
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
    } = gameState
    let newPoints = 0

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
      const newScores = [...gameState.scores]
      newScores[currentPlayer] += newWinningLines.length

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
            color: playerColors[currentPlayer],
          })
        }

        newPoints++
        if (move) {
          move.scoredLines.push(lineId)
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
    return newPoints
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

  function playSound(soundName) {
    const audio = sounds[soundName]
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((e) => console.error(`Could not play sound: ${e}`))
    }
  }

  async function playSoundSequentially(soundName, times) {
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

  // --- SETUP PHASE FUNCTIONS (Imperative, run before game starts) ---

  function initGame(isNewGame) {
    let settings = {}
    if (isNewGame) {
      settings.playerNames = playerSetupList.map((p) => p.name)
      settings.numPlayers = parseInt(numPlayersInput.value)
      settings.gridSize = parseInt(gridSizeInput.value)
      settings.matchLength = parseInt(matchLengthInput.value)
      settings.selectedUnits = [
        ...document.querySelectorAll(".phonics-unit-select"),
      ]
        .map((select) => select.value)
        .filter((value) => value)
      const shuffledColors = [...COLOR_PALETTE].sort(() => 0.5 - Math.random())
      settings.playerColors = shuffledColors.slice(0, settings.numPlayers)
      settings.showLines = showLinesToggle.checked
      if (settings.selectedUnits.length === 0) {
        alert("Please select at least one word unit to start the game.")
        return
      }
    } else {
      settings = {
        playerNames: gameState.playerNames,
        numPlayers: gameState.numPlayers,
        gridSize: gameState.gridSize,
        matchLength: gameState.matchLength,
        selectedUnits: gameState.selectedUnits,
        playerColors: gameState.playerColors,
        showLines: gameState.showLines,
      }
    }

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
    }

    setupView.classList.add("hidden")
    gameView.classList.remove("hidden")

    render()
    addGameEventListeners() // Use the new function to add listeners.
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

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".player-name-field:not(.dragging)"),
    ]
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child }
        } else {
          return closest
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element
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
    let maxScore = -1
    let winners = []
    for (let i = 0; i < gameState.numPlayers; i++) {
      if (gameState.scores[i] > maxScore) {
        maxScore = gameState.scores[i]
        winners = [i]
      } else if (gameState.scores[i] === maxScore && maxScore > 0) {
        winners.push(i)
      }
    }
    if (winners.length === 0 || maxScore === 0) {
      winnerText = "No one scored any points! It's a draw."
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

    gameDialog.showModal()
  }

  // --- THEME HUE SWITCHER LOGIC ---
  const themeHueSelect = document.getElementById("themeHueSelect")

  const handleHueChange = (e) => {
    const newHue = e.target.value
    document.documentElement.style.setProperty("--palette-hue", newHue)
  }

  themeHueSelect.addEventListener("change", handleHueChange)
  
  // --- INITIALIZE and ATTACH LISTENERS ---

  numPlayersInput.addEventListener("input", updateSliderValues)
  gridSizeInput.addEventListener("input", syncSliders)
  addUnitBtn.addEventListener("click", createUnitSelector)
  startGameBtn.addEventListener("click", () => initGame(true))
  randomizeOrderBtn.addEventListener("click", randomizePlayerOrder)

  matchLengthInput.addEventListener("input", () => {
    matchLengthValue.textContent = matchLengthInput.value
  })

  playerNamesContainer.addEventListener("dragover", (e) => {
    e.preventDefault()
    const afterElement = getDragAfterElement(playerNamesContainer, e.clientY)

    playerNamesContainer
      .querySelectorAll(".drag-over-top, .drag-over-bottom")
      .forEach((el) => {
        el.classList.remove("drag-over-top", "drag-over-bottom")
      })

    if (afterElement) {
      afterElement.classList.add("drag-over-top")
    } else {
      const lastElement = playerNamesContainer.querySelector(
        ".player-name-field:not(.dragging):last-child"
      )
      if (lastElement) {
        lastElement.classList.add("drag-over-bottom")
      }
    }
  })

  playerNamesContainer.addEventListener("drop", (e) => {
    e.preventDefault()
    playerNamesContainer
      .querySelectorAll(".drag-over-top, .drag-over-bottom")
      .forEach((el) => {
        el.classList.remove("drag-over-top", "drag-over-bottom")
      })

    const dragging = playerNamesContainer.querySelector(".dragging")
    if (!dragging) return

    const draggingId = parseInt(dragging.dataset.playerId)
    const afterElement = getDragAfterElement(playerNamesContainer, e.clientY)

    const draggedItemIndex = playerSetupList.findIndex(
      (p) => p.id === draggingId
    )
    const [draggedItem] = playerSetupList.splice(draggedItemIndex, 1)

    if (afterElement == null) {
      playerSetupList.push(draggedItem)
    } else {
      const afterId = parseInt(afterElement.dataset.playerId)
      const dropIndex = playerSetupList.findIndex((p) => p.id === afterId)
      playerSetupList.splice(dropIndex, 0, draggedItem)
    }

    renderNameInputs()
  })

  updateSliderValues()
  createUnitSelector()
  selectRandomUnit()
})
