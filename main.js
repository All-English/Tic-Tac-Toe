import {
  smartPhonicsWordBank,
  MATCH_LENGTH,
  playerSymbols,
  COLOR_PALETTE,
} from "./config.js"

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let gameState = {}
  let areGameEventListenersAttached = false
  let playerSetupList = []

  // ✅ Updated sound file extensions and added a simple sound system
  const sounds = {
    click: new Audio("sounds/click.mp3"),
    block: new Audio("sounds/block.mp3"),
    score: new Audio("sounds/score.mp3"),
    gameOver: new Audio("sounds/game-over.mp3"),
  }

  // --- DOM ELEMENTS ---
  const setupView = document.getElementById("game-setup")
  const numPlayersInput = document.getElementById("numPlayers")
  const numPlayersValue = document.getElementById("numPlayersValue")
  const playerNamesContainer = document.getElementById("player-names-container")
  const gridSizeInput = document.getElementById("gridSize")
  const gridSizeValue = document.getElementById("gridSizeValue")
  const unitSelectorsContainer = document.getElementById(
    "unit-selectors-container"
  )
  const addUnitBtn = document.getElementById("addUnitBtn")
  const startGameBtn = document.getElementById("startGameBtn")
  const showLinesToggle = document.getElementById("showLinesToggle")
  const randomizeOrderBtn = document.getElementById("randomizeOrderBtn")

  // --- EVENT LISTENERS ---

  function setupGameEventListeners() {
    if (areGameEventListenersAttached) return

    const resetGameBtn = document.getElementById("resetGameBtn")
    const backToSettingsBtn = document.getElementById("settings-btn")
    const playAgainBtn = document.getElementById("play-again-btn")
    const gameDialog = document.getElementById("game-over-dialog")

    const goBackToSettings = () => {
      const gameView = document.getElementById("game-view")
      gameView.classList.add("hidden")

      document.getElementById("player-info-list").innerHTML = ""
      document.getElementById("game-board").innerHTML = ""
      gameState = {}

      setupView.classList.remove("hidden")
    }

    resetGameBtn.addEventListener("click", () => initGame(false))
    backToSettingsBtn.addEventListener("click", goBackToSettings)
    playAgainBtn.addEventListener("click", () => {
      gameDialog.close()
      initGame(false)
    })

    document.addEventListener("keydown", (e) => {
      const gameView = document.getElementById("game-view")
      if (gameView.classList.contains("hidden")) return
      if (e.key === "Backspace") {
        undoLastMove()
      }
    })

    areGameEventListenersAttached = true
  }

  // --- FUNCTIONS ---

  // ✅ New sound functions to handle sequential playback
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
        const playAudio = () => {
          audio.currentTime = 0
          audio.play().catch((e) => {
            console.error(`Could not play sound: ${e}`)
            resolve() // Resolve even if there's an error to not block the loop
          })
        }
        audio.onended = () => resolve()
        playAudio()
      })
    }
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

    const defaultGridSize = newCount + 1
    gridSizeInput.value = defaultGridSize
    gridSizeValue.textContent = `${defaultGridSize}x${defaultGridSize}`

    renderNameInputs()
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

  function initGame(isNewGame) {
    let settings = {}
    if (isNewGame) {
      settings.playerNames = playerSetupList.map((p) => p.name)
      settings.numPlayers = parseInt(numPlayersInput.value)
      settings.gridSize = parseInt(gridSizeInput.value)
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
        numPlayers: gameState.numPlayers,
        gridSize: gameState.gridSize,
        playerNames: gameState.playerNames,
        selectedUnits: gameState.selectedUnits,
        playerColors: gameState.playerColors,
        showLines: gameState.showLines,
      }
    }
    gameState = {
      ...settings,
      board: Array(settings.gridSize * settings.gridSize).fill(null),
      scores: Array(settings.numPlayers).fill(0),
      currentPlayer: 0,
      movesMade: 0,
      completedLines: new Set(),
      moveHistory: [],
    }

    const words = getCombinedWords(
      gameState.selectedUnits,
      gameState.gridSize * gameState.gridSize
    )

    setupView.classList.add("hidden")
    document.getElementById("game-view").classList.remove("hidden")

    renderBoard(words)
    renderPlayerInfo()

    setupGameEventListeners()
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

  function renderBoard(words) {
    const gameBoard = document.getElementById("game-board")
    gameBoard.innerHTML = ""
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`

    if (gameState.gridSize > 8) {
      gameBoard.classList.add("large-grid")
    } else {
      gameBoard.classList.remove("large-grid")
    }

    for (let i = 0; i < gameState.gridSize * gameState.gridSize; i++) {
      const cell = document.createElement("button")
      cell.classList.add("button", "cell")
      cell.dataset.index = i
      const wordObject = words[i] || { word: "?", target: "" }
      cell.innerHTML = highlightTargetSounds(wordObject.word, wordObject.target)
      cell.addEventListener("click", handleCellClick)
      gameBoard.appendChild(cell)
    }
  }

  function renderPlayerInfo() {
    const playerInfoList = document.getElementById("player-info-list")
    playerInfoList.innerHTML = ""
    for (let i = 0; i < gameState.numPlayers; i++) {
      const playerBlock = document.createElement("div")
      playerBlock.className = "card outlined player-info-block"
      playerBlock.id = `player-${i}-info-block`
      const playerColor = gameState.playerColors[i]
      playerBlock.style.setProperty("--player-color", playerColor)
      const hgroup = document.createElement("hgroup")
      const nameHeader = document.createElement("h3")
      nameHeader.className = "h6"
      nameHeader.textContent = `${gameState.playerNames[i]} (${playerSymbols[i]})`
      hgroup.appendChild(nameHeader)
      const contentDiv = document.createElement("div")
      contentDiv.className = "content"
      contentDiv.id = `player-${i}-score`
      contentDiv.textContent = `Score: ${gameState.scores[i]}`
      playerBlock.appendChild(hgroup)
      playerBlock.appendChild(contentDiv)
      playerInfoList.appendChild(playerBlock)
    }
    updatePlayerHighlight()
  }

  function updatePlayerHighlight() {
    const playerInfoList = document.getElementById("player-info-list")
    playerInfoList.querySelectorAll(".player-info-block").forEach((el) => {
      el.classList.remove("current-player")
    })
    const currentPlayerBlock = document.getElementById(
      `player-${gameState.currentPlayer}-info-block`
    )
    if (currentPlayerBlock) {
      currentPlayerBlock.classList.add("current-player")
    }
  }

  function handleCellClick(event) {
    const cell = event.target.closest(".cell")
    if (!cell) return

    const index = parseInt(cell.dataset.index)
    if (gameState.board[index] !== null) return

    // Check for a block *before* placing the new piece
    const wasBlock = checkForBlock(index)
    // Now, place the piece
    gameState.board[index] = gameState.currentPlayer

    const move = {
      index: index,
      player: gameState.currentPlayer,
      scoredLines: [],
      lineElements: [],
    }

    cell.dataset.playerSymbol = playerSymbols[gameState.currentPlayer]
    cell.dataset.playerId = gameState.currentPlayer
    const playerColor = gameState.playerColors[gameState.currentPlayer]
    cell.style.setProperty("--player-color", playerColor)
    cell.disabled = true

    const pointsScored = checkForWins(move)

    // Play sounds and trigger animations based on the outcome
    if (pointsScored > 0) {
      playSoundSequentially("score", pointsScored)
    } else if (wasBlock) {
      playSound("block")
      // Add animation class and remove it when finished so it can play again
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

    gameState.moveHistory.push(move)
    gameState.movesMade++
    if (gameState.movesMade === gameState.gridSize * gameState.gridSize) {
      endGame()
    } else {
      gameState.currentPlayer =
        (gameState.currentPlayer + 1) % gameState.numPlayers
      updatePlayerHighlight()
    }
  }
  function undoLastMove() {
    if (gameState.moveHistory.length === 0) return
    const lastMove = gameState.moveHistory.pop()
    gameState.movesMade--
    gameState.currentPlayer = lastMove.player
    gameState.board[lastMove.index] = null
    const cell = document.querySelector(
      `#game-board .cell[data-index='${lastMove.index}']`
    )
    cell.removeAttribute("data-player-symbol")
    cell.removeAttribute("data-player-id")
    cell.style.removeProperty("--player-color")
    cell.disabled = false

    lastMove.lineElements.forEach((line) => line.remove())

    if (lastMove.scoredLines.length > 0) {
      gameState.scores[lastMove.player] -= lastMove.scoredLines.length
      lastMove.scoredLines.forEach((lineId) => {
        gameState.completedLines.delete(lineId)
        const indices = lineId.split(",").map(Number)
        indices.forEach((index) => {
          const scoredCell = document.querySelector(
            `#game-board .cell[data-index='${index}']`
          )
          if (scoredCell) {
            const isStillHighlighted = Array.from(
              gameState.completedLines
            ).some((l) => l.split(",").includes(String(index)))
            if (!isStillHighlighted) {
              scoredCell.classList.remove("highlight")
              scoredCell.style.removeProperty("--player-color")
            }
          }
        })
      })
    }
    updateScoreDisplay(lastMove.player)
    updatePlayerHighlight()
  }

  function updateScoreDisplay(playerIndex) {
    const scoreDiv = document.getElementById(`player-${playerIndex}-score`)
    if (scoreDiv)
      scoreDiv.textContent = `Score: ${gameState.scores[playerIndex]}`
  }

  function lineToString(line) {
    return [...line].sort((a, b) => a - b).join(",")
  }

  function getWinningLines(board, player, gridSize) {
    const newWins = []
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (c <= gridSize - MATCH_LENGTH) {
          const line = Array.from(
            { length: MATCH_LENGTH },
            (_, i) => r * gridSize + c + i
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
        if (r <= gridSize - MATCH_LENGTH) {
          const line = Array.from(
            { length: MATCH_LENGTH },
            (_, i) => (r + i) * gridSize + c
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
        if (r <= gridSize - MATCH_LENGTH && c <= gridSize - MATCH_LENGTH) {
          const line = Array.from(
            { length: MATCH_LENGTH },
            (_, i) => (r + i) * gridSize + (c + i)
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
        if (r <= gridSize - MATCH_LENGTH && c >= MATCH_LENGTH - 1) {
          const line = Array.from(
            { length: MATCH_LENGTH },
            (_, i) => (r + i) * gridSize + (c - i)
          )
          if (line.every((index) => board[index] === player)) newWins.push(line)
        }
      }
    }
    return newWins
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
        gameState.gridSize
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

  function checkForWins(move) {
    const { board, currentPlayer, completedLines } = gameState
    let newPoints = 0

    const potentialWins = getWinningLines(
      board,
      currentPlayer,
      gameState.gridSize
    )
    const newWinningLines = potentialWins.filter(
      (line) => !completedLines.has(lineToString(line))
    )

    newWinningLines.forEach((line) => {
      const lineId = lineToString(line)
      completedLines.add(lineId)
      const lineElement = highlightWin(line, currentPlayer)
      newPoints++
      if (move) {
        move.scoredLines.push(lineId)
        if (lineElement) move.lineElements.push(lineElement)
      }
    })

    if (newPoints > 0) {
      gameState.scores[currentPlayer] += newPoints
      updateScoreDisplay(currentPlayer)
    }

    return newPoints
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

    gameBoard.appendChild(line)
    return line
  }

  function highlightWin(indices, playerIndex) {
    const playerColor = gameState.playerColors[playerIndex]
    const gameBoard = document.getElementById("game-board")
    const firstCell = gameBoard.querySelector(`[data-index='${indices[0]}']`)
    const lastCell = gameBoard.querySelector(
      `[data-index='${indices[indices.length - 1]}']`
    )

    indices.forEach((cellIndex, arrayIndex) => {
      const cell = gameBoard.querySelector(`[data-index='${cellIndex}']`)
      cell.classList.add("highlight")
      cell.style.setProperty("--player-color", playerColor)

      // Add the pulse class and a staggered animation delay
      cell.classList.add("pulse")
      const delay = arrayIndex * 100 // 100ms delay between each pulse
      cell.style.animationDelay = `${delay}ms`

      // Remove the class and style after the animation finishes
      cell.addEventListener(
        "animationend",
        () => {
          cell.classList.remove("pulse")
          cell.style.removeProperty("animation-delay")
        },
        { once: true }
      )
    })

    if (gameState.showLines && firstCell && lastCell) {
      return drawLine(firstCell, lastCell, playerColor)
    }
    return null
  }
  function endGame() {
    playSound("gameOver")
    const gameDialog = document.getElementById("game-over-dialog")
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

  // --- INITIALIZE and ATTACH LISTENERS ---

  numPlayersInput.addEventListener("input", updateSliderValues)
  gridSizeInput.addEventListener("input", () => {
    gridSizeValue.textContent = `${gridSizeInput.value}x${gridSizeInput.value}`
  })
  addUnitBtn.addEventListener("click", createUnitSelector)
  startGameBtn.addEventListener("click", () => initGame(true))
  randomizeOrderBtn.addEventListener("click", randomizePlayerOrder)

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
