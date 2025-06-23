document.addEventListener("DOMContentLoaded", () => {
  const smartPhonicsWordBank = {
    level1: {
      unit1: { targetSound: "a,b,c", words: ["A", "a", "B", "b", "C", "c"] },
      unit2: { targetSound: "d,e,f", words: ["D", "d", "E", "e", "F", "f"] },
      unit3: { targetSound: "g,h,i", words: ["G", "g", "H", "h", "I", "i"] },
      unit4: { targetSound: "j,k,l", words: ["J", "j", "K", "k", "L", "l"] },
      unit5: { targetSound: "m,n,o", words: ["M", "m", "N", "n", "O", "o"] },
      unit6: { targetSound: "p,q,r", words: ["P", "p", "Q", "q", "R", "r"] },
      unit7: {
        targetSound: "s,t,u,v",
        words: ["S", "s", "T", "t", "U", "u", "V", "v"],
      },
      unit8: {
        targetSound: "w,x,y,z",
        words: ["W", "w", "X", "x", "Y", "y", "Z", "z"],
      },
    },
    level2: {
      unit1: {
        targetSound: "a",
        words: ["dam", "ham", "jam", "ram", "cap", "lap", "map", "nap"],
      },
      unit2: {
        targetSound: "a",
        words: ["can", "fan", "man", "pan", "bat", "cat", "hat", "mat"],
      },
      unit3: {
        targetSound: "e",
        words: ["jet", "net", "vet", "wet", "bed", "red", "hen", "pen"],
      },
      unit4: {
        targetSound: "i",
        words: ["bib", "rib", "kid", "lid", "pig", "wig", "fin", "pin"],
      },
      unit5: {
        targetSound: "i",
        words: ["dip", "hip", "lip", "rip", "hit", "sit", "mix", "six"],
      },
      unit6: {
        targetSound: "o",
        words: ["hot", "pot", "box", "fox", "cop", "hop", "dog", "log"],
      },
      unit7: {
        targetSound: "u",
        words: ["bug", "hug", "mug", "rug", "rub", "tub", "cup", "pup"],
      },
      unit8: {
        targetSound: "u",
        words: ["bun", "fun", "run", "sun", "bud", "mud", "cut", "nut"],
      },
    },
    level3: {
      unit1: {
        targetSound: "a_e",
        words: ["bake", "cake", "lake", "rake", "cape", "tape", "cave", "wave"],
      },
      unit2: {
        targetSound: "a_e",
        words: ["game", "name", "date", "gate", "cane", "mane", "case", "vase"],
      },
      unit3: {
        targetSound: "i_e",
        words: ["line", "nine", "pine", "vine", "bike", "hike", "lime", "time"],
      },
      unit4: {
        targetSound: "i_e",
        words: ["hide", "ride", "pipe", "wipe", "bite", "kite", "dive", "five"],
      },
      unit5: {
        targetSound: "o_e",
        words: ["hose", "nose", "pose", "rose", "hope", "rope", "note", "vote"],
      },
      unit6: {
        targetSound: "o_e",
        words: ["hole", "mole", "pole", "sole", "dome", "home", "bone", "cone"],
      },
      unit7: {
        targetSound: "u_e",
        words: ["cube", "tube", "cute", "mute", "mule", "dune", "June", "tune"],
      },
    },
    level4: {
      unit1: {
        targetSound: "bl, cl, fl",
        words: [
          "black",
          "blade",
          "blimp",
          "blue",
          "clam",
          "clap",
          "cliff",
          "clock",
          "flag",
          "flame",
          "flap",
          "flute",
        ],
      },
      unit2: {
        targetSound: "br, cr, fr",
        words: [
          "brake",
          "brave",
          "brick",
          "bride",
          "crab",
          "crane",
          "crib",
          "cross",
          "frame",
          "frog",
          "front",
          "frost",
        ],
      },
      unit3: {
        targetSound: "gl, pl, sl",
        words: [
          "glass",
          "globe",
          "glove",
          "glue",
          "plane",
          "plant",
          "plate",
          "plum",
          "sled",
          "slice",
          "slide",
          "slim",
        ],
      },
      unit4: {
        targetSound: "dr, pr, tr",
        words: [
          "dragon",
          "dress",
          "drive",
          "drum",
          "press",
          "price",
          "print",
          "prize",
          "trace",
          "track",
          "truck",
          "trumpet",
        ],
      },
      unit5: {
        targetSound: "sm, sn, st, sw",
        words: [
          "smell",
          "smile",
          "smoke",
          "snack",
          "snake",
          "snore",
          "stone",
          "stop",
          "stove",
          "sweet",
          "swim",
          "swing",
        ],
      },
      unit6: {
        targetSound: "ng, nk",
        words: [
          "bang",
          "fang",
          "king",
          "ring",
          "gong",
          "song",
          "bank",
          "tank",
          "pink",
          "wink",
          "dunk",
          "junk",
        ],
      },
      unit7: {
        targetSound: "sh, ch",
        words: [
          "shape",
          "ship",
          "shop",
          "brush",
          "fish",
          "flash",
          "cherry",
          "chick",
          "chin",
          "bench",
          "branch",
          "catch",
        ],
      },
      unit8: {
        targetSound: "th, wh",
        words: [
          "thick",
          "thin",
          "thumb",
          "bath",
          "math",
          "teeth",
          "whale",
          "wheel",
          "whip",
          "whisk",
          "whisper",
          "white",
        ],
      },
    },
    level5: {
      unit1: {
        targetSound: "ee, ea",
        words: [
          "bee",
          "feet",
          "green",
          "peel",
          "seed",
          "tree",
          "leaf",
          "meat",
          "peanut",
          "sea",
          "seal",
          "tea",
        ],
      },
      unit2: {
        targetSound: "oa, ow",
        words: [
          "boat",
          "coat",
          "goat",
          "road",
          "soap",
          "toast",
          "blow",
          "bowl",
          "pillow",
          "snow",
          "window",
          "yellow",
        ],
      },
      unit3: {
        targetSound: "ai, ay",
        words: [
          "mail",
          "nail",
          "rail",
          "rain",
          "tail",
          "train",
          "clay",
          "gray",
          "hay",
          "play",
          "pray",
          "tray",
        ],
      },
      unit4: {
        targetSound: "oi, oy",
        words: [
          "boil",
          "coil",
          "coin",
          "foil",
          "oil",
          "point",
          "soil",
          "toilet",
          "boy",
          "joy",
          "soybean",
          "toy",
        ],
      },
      unit5: {
        targetSound: "ow, ou",
        words: [
          "brown",
          "clown",
          "cow",
          "crown",
          "gown",
          "owl",
          "blouse",
          "cloud",
          "count",
          "house",
          "mouse",
          "mouth",
        ],
      },
      unit6: {
        targetSound: "ir, er, ur",
        words: [
          "bird",
          "girl",
          "shirt",
          "skirt",
          "letter",
          "singer",
          "soccer",
          "teacher",
          "nurse",
          "purple",
          "purse",
          "turtle",
        ],
      },
      unit7: {
        targetSound: "ar, or",
        words: [
          "arm",
          "car",
          "card",
          "farmer",
          "park",
          "star",
          "cork",
          "corn",
          "fork",
          "horse",
          "north",
          "store",
        ],
      },
      unit8: {
        targetSound: "oo",
        words: [
          "book",
          "cook",
          "foot",
          "hook",
          "look",
          "wood",
          "food",
          "goose",
          "moon",
          "pool",
          "spoon",
          "zoo",
        ],
      },
    },
  }

  // --- STATE ---
  const MATCH_LENGTH = 3 // The number of tiles in a row needed to score
  let gameState = {}
  let areGameEventListenersAttached = false
  const playerSymbols = ["X", "O", "△", "□", "☆"]
  const COLOR_PALETTE = [
    "var(--orange-7)",
    "var(--pink-7)",
    "var(--green-7)",
    "var(--blue-7)",
    "var(--violet-7)",
    "var(--cyan-7)",
    "var(--red-7)",
  ]

  // --- DOM ELEMENTS (Setup-only elements are grabbed now)---
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

  function renderNameInputs() {
    const count = parseInt(numPlayersInput.value, 10)
    playerNamesContainer.innerHTML = ""
    for (let i = 0; i < count; i++) {
      const field = document.createElement("label")
      field.className = "field"
      const label = document.createElement("span")
      label.className = "label"
      label.textContent = `Player ${i + 1} Name`
      const input = document.createElement("input")
      input.type = "text"
      input.className = "player-name-input"
      input.value = `Player ${i + 1}`
      input.dataset.playerId = i
      field.appendChild(label)
      field.appendChild(input)
      playerNamesContainer.appendChild(field)
    }
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
    numPlayersValue.textContent = numPlayersInput.value
    const defaultGridSize = parseInt(numPlayersInput.value) + 1
    gridSizeInput.value = defaultGridSize
    gridSizeValue.textContent = `${gridSizeInput.value}x${gridSizeInput.value}`
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

  // This is the only function that needs to be changed in script.js
  function highlightTargetSounds(word, targetSoundString) {
    if (!targetSoundString) {
      return `<span>${word}</span>` // Return plain word if no sounds to highlight
    }

    const targetSounds = targetSoundString.split(",").map((s) => s.trim())
    let resultHTML = ""
    let i = 0

    while (i < word.length) {
      let foundMatch = false
      for (const sound of targetSounds) {
        // Handle "magic e" rules like "a_e"
        if (sound.includes("_")) {
          const parts = sound.split("_")
          if (
            i + 2 < word.length &&
            word[i]?.toLowerCase() === parts[0] &&
            word[i + 2]?.toLowerCase() === parts[1]
          ) {
            resultHTML += `<span class="target-sounds">${word[i]}</span>` // Vowel
            resultHTML += `<span>${word[i + 1]}</span>` // Consonant
            resultHTML += `<span class="target-sounds">${word[i + 2]}</span>` // Final 'e'
            i += 3
            foundMatch = true
            break
          }
        }
        // Handle normal multi-letter sounds like "bl" or "sh"
        else if (word.substring(i, i + sound.length).toLowerCase() === sound) {
          resultHTML += `<span class="target-sounds">${word.substring(
            i,
            i + sound.length
          )}</span>`
          i += sound.length
          foundMatch = true
          break
        }
      }
      // If no match was found at the current position, add the single character
      if (!foundMatch) {
        resultHTML += `<span>${word[i]}</span>`
        i++
      }
    }
    // Wrap the entire result in a flex container to remove whitespace issues
    return `<span class="word-wrapper">${resultHTML}</span>`
  }

  function initGame(isNewGame) {
    let settings = {}
    if (isNewGame) {
      settings.numPlayers = parseInt(numPlayersInput.value)
      settings.gridSize = parseInt(gridSizeInput.value)
      settings.playerNames = [
        ...document.querySelectorAll(".player-name-input"),
      ].map(
        (input) =>
          input.value || `Player ${parseInt(input.dataset.playerId) + 1}`
      )
      settings.selectedUnits = [
        ...document.querySelectorAll(".phonics-unit-select"),
      ]
        .map((select) => select.value)
        .filter((value) => value)

      // ✅ Shuffle the color palette and assign to players
      const shuffledColors = [...COLOR_PALETTE].sort(() => 0.5 - Math.random())
      settings.playerColors = shuffledColors.slice(0, settings.numPlayers)

      if (settings.selectedUnits.length === 0) {
        alert("Please select at least one word unit to start the game.")
        return
      }
    } else {
      // On reset, keep the same settings, including the randomized colors from that round
      settings = {
        numPlayers: gameState.numPlayers,
        gridSize: gameState.gridSize,
        playerNames: gameState.playerNames,
        selectedUnits: gameState.selectedUnits,
        playerColors: gameState.playerColors, // Persist colors on reset
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

  // ✅ Refactored to return objects with word and target sound
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

      // ✅ Set the custom property for this player's card
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

    const move = {
      index: index,
      player: gameState.currentPlayer,
      scoredLines: [],
    }
    gameState.board[index] = gameState.currentPlayer
    cell.dataset.playerSymbol = playerSymbols[gameState.currentPlayer]
    cell.dataset.playerId = gameState.currentPlayer

    // ✅ Apply the dynamic color to the cell
    const playerColor = gameState.playerColors[gameState.currentPlayer]
    cell.style.setProperty("--player-color", playerColor)

    cell.disabled = true
    const pointsScored = checkForWins(move)
    if (pointsScored > 0) {
      gameState.scores[gameState.currentPlayer] += pointsScored
      updateScoreDisplay(gameState.currentPlayer)
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
    cell.style.removeProperty("--player-color") // ✅ Clear the color on undo
    cell.disabled = false

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
              scoredCell.style.removeProperty("--player-color") // ✅ Clear color
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

  function checkForWins(move) {
    const { gridSize, board, currentPlayer, completedLines } = gameState
    let newPoints = 0

    const checkLine = (line) => {
      const isWin = line.every((index) => board[index] === currentPlayer)
      const lineId = lineToString(line)
      if (isWin && !completedLines.has(lineId)) {
        completedLines.add(lineId)
        highlightWin(line, currentPlayer)
        newPoints++
        if (move) move.scoredLines.push(lineId)
      }
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Check Horizontal
        if (c <= gridSize - MATCH_LENGTH) {
          const line = []
          for (let i = 0; i < MATCH_LENGTH; i++) {
            line.push(r * gridSize + c + i)
          }
          checkLine(line)
        }

        // Check Vertical
        if (r <= gridSize - MATCH_LENGTH) {
          const line = []
          for (let i = 0; i < MATCH_LENGTH; i++) {
            line.push((r + i) * gridSize + c)
          }
          checkLine(line)
        }

        // Check Diagonal (down-right)
        if (r <= gridSize - MATCH_LENGTH && c <= gridSize - MATCH_LENGTH) {
          const line = []
          for (let i = 0; i < MATCH_LENGTH; i++) {
            line.push((r + i) * gridSize + (c + i))
          }
          checkLine(line)
        }

        // Check Diagonal (down-left)
        if (r <= gridSize - MATCH_LENGTH && c >= MATCH_LENGTH - 1) {
          const line = []
          for (let i = 0; i < MATCH_LENGTH; i++) {
            line.push((r + i) * gridSize + (c - i))
          }
          checkLine(line)
        }
      }
    }
    return newPoints
  }

  function highlightWin(indices, playerIndex) {
    const playerColor = gameState.playerColors[playerIndex]
    indices.forEach((index) => {
      const cell = document.querySelector(
        `#game-board .cell[data-index='${index}']`
      )
      cell.classList.add("highlight")
      cell.style.setProperty("--player-color", playerColor) // ✅ Apply color on highlight
    })
  }

  function endGame() {
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

    // Create a list of players to sort
    const sortedPlayers = gameState.playerNames.map((name, index) => ({
      name: name,
      score: gameState.scores[index],
      symbol: playerSymbols[index],
      originalIndex: index,
    }))

    // Sort players by score in descending order
    sortedPlayers.sort((a, b) => b.score - a.score)

    let finalScoresHTML = `<div class="score-list">`
    const trophyIcon = "🏆"

    // Build the HTML from the sorted list
    sortedPlayers.forEach((player) => {
      const isWinner = winners.includes(player.originalIndex)
      const winnerClass = isWinner ? "winner" : ""
      finalScoresHTML += `
                        <div class="score-line ${winnerClass}">
                            ${isWinner ? trophyIcon : ""}
                            <span>${player.name} (${player.symbol}): ${
        player.score
      }</span>
                        </div>
                    `
    })

    finalScoresHTML += `</div>`
    dialogContent.innerHTML = winnerHTML + finalScoresHTML

    gameDialog.showModal()
  }

  // --- INITIALIZE ---
  numPlayersInput.addEventListener("input", updateSliderValues)
  gridSizeInput.addEventListener("input", () => {
    gridSizeValue.textContent = `${gridSizeInput.value}x${gridSizeInput.value}`
  })
  addUnitBtn.addEventListener("click", createUnitSelector)
  startGameBtn.addEventListener("click", () => initGame(true))

  updateSliderValues()
  createUnitSelector()
  selectRandomUnit()
})
