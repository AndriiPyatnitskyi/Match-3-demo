// Level object
var level = {
    x: 250,         // X position
    y: 113,         // Y position
    columns: 5,     // Number of tile columns
    rows: 5,        // Number of tile rows
    tileWidth: 40,  // Visual width of a tile
    tileHeight: 40, // Visual height of a tile
    tiles: [],      // The two-dimensional tile array
    selectedTile: {selected: false, column: 0, row: 0}
};

window.onload = function () {

    // Get the canvas and context
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");

    // Timing and frames per second
    var lastFrame = 0;

    // Mouse dragging
    var drag = false;


    // All of the different tile colors in RGB
    var tileColors = [
        [29, 73, 249],
        [249, 29, 29],
        [249, 242, 29],
        [36, 249, 29]
    ];

    // Clusters and moves that were found
    var clusters = [];  // { column, row, length, horizontal }
    var moves = [];     // { column1, row1, column2, row2 }

    // Current move
    var currentMove = {column1: 0, row1: 0, column2: 0, row2: 0};

    // Game states
    var gameStates = {init: 0, ready: 1, resolve: 2};
    var gameState = gameStates.init;

    // Score
    var score = 0;

    // Animation variables
    var animationState = 0;
    var animationTime = 0;
    var animationTimeTotal = 0.3;

    // Show available moves
    var showMoves = false;

    // The AI bot
    var aiBot = false;

    // Game Over
    var gameOver = false;

    // Gui buttons
    var buttons = [{x: 30, y: 240, width: 150, height: 50, text: "New Game"},
        {x: 30, y: 300, width: 150, height: 50, text: "Show Moves"},
        {x: 30, y: 360, width: 150, height: 50, text: "Enable AI Bot"}];



    // var inputDimension = document.getElementById("dimensionButton");
    // inputDimension.oninput = function () {
    //     console.log(inputDimension.value);
    //
    // }


    // Initialize the game
    function init() {
        // Add mouse events
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseout", onMouseOut);

        // Initialize the two-dimensional tile array
        for (var i = 0; i < level.columns; i++) {
            level.tiles[i] = [];
            for (var j = 0; j < level.rows; j++) {
                // Define a tile type and a shift parameter for animation
                level.tiles[i][j] = {type: 0, shift: 0}
            }
        }

        newGame();

        // Enter main loop
        main(0);
    }

    // Main loop
    function main(tFrame) {
        // Request animation frames
        window.requestAnimationFrame(main);

        // Update and render the game
        update(tFrame);
        render();
    }

    // Update the game state
    function update(tFrame) {
        var dt = (tFrame - lastFrame) / 1000;
        lastFrame = tFrame;

        if (gameState == gameStates.ready) {
            // Game is ready for player input

            // Check for game over
            if (moves.length <= 0) {
                gameOver = true;
            }

            // Let the AI bot make a move, if enabled
            if (aiBot) {
                animationTime += dt;
                if (animationTime > animationTimeTotal) {
                    // Check if there are moves available
                    findMoves();

                    if (moves.length > 0) {
                        // Get a random valid move
                        var move = moves[Math.floor(Math.random() * moves.length)];

                        // Simulate a player using the mouse to swap two tiles
                        mouseSwap(move.column1, move.row1, move.column2, move.row2);
                    } else {
                        // No moves left, Game Over. We could start a new game.
                        // newGame();
                    }
                    animationTime = 0;
                }
            }
        } else if (gameState == gameStates.resolve) {
            // Game is busy resolving and animating clusters
            animationTime += dt;

            if (animationState == 0) {
                // Clusters need to be found and removed
                if (animationTime > animationTimeTotal) {
                    // Find clusters
                    findClusters();

                    if (clusters.length > 0) {
                        // Add points to the score
                        for (var i = 0; i < clusters.length; i++) {
                            // Add extra points for longer clusters
                            score += 100 * (clusters[i].length - 2);
                            ;
                        }

                        // Clusters found, remove them
                        removeClusters();

                        // Tiles need to be shifted
                        animationState = 1;
                    } else {
                        // No clusters found, animation complete
                        gameState = gameStates.ready;
                    }
                    animationTime = 0;
                }
            } else if (animationState == 1) {
                // Tiles need to be shifted
                if (animationTime > animationTimeTotal) {
                    // Shift tiles
                    shiftTiles();

                    // New clusters need to be found
                    animationState = 0;
                    animationTime = 0;

                    // Check if there are new clusters
                    findClusters();
                    if (clusters.length <= 0) {
                        // Animation complete
                        gameState = gameStates.ready;
                    }
                }
            } else if (animationState == 2) {
                // Swapping tiles animation
                if (animationTime > animationTimeTotal) {
                    // Swap the tiles
                    swap(currentMove.column1, currentMove.row1, currentMove.column2, currentMove.row2);

                    // Check if the swap made a cluster
                    findClusters();
                    if (clusters.length > 0) {
                        // Valid swap, found one or more clusters
                        // Prepare animation states
                        animationState = 0;
                        animationTime = 0;
                        gameState = gameStates.resolve;
                    } else {
                        // Invalid swap, Rewind swapping animation
                        animationState = 3;
                        animationTime = 0;
                    }

                    // Update moves and clusters
                    findMoves();
                    findClusters();
                }
            } else if (animationState == 3) {
                // Rewind swapping animation
                if (animationTime > animationTimeTotal) {
                    // Invalid swap, swap back
                    swap(currentMove.column1, currentMove.row1, currentMove.column2, currentMove.row2);

                    // Animation complete
                    gameState = gameStates.ready;
                }
            }

            // Update moves and clusters
            findMoves();
            findClusters();
        }
    }

    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textDim = context.measureText(text);
        context.fillText(text, x + (width - textDim.width) / 2, y);
    }

    // Render the game
    function render() {
        // Draw the frame
        drawFrame();

        // Draw score
        context.fillStyle = "#000000";
        context.font = "24px Verdana";
        drawCenterText("Score:", 30, level.y + 40, 150);
        drawCenterText(score, 30, level.y + 70, 150);

        // Draw buttons
        drawButtons();

        // Draw level background
        var levelWidth = level.columns * level.tileWidth;
        var levelHeight = level.rows * level.tileHeight;
        context.fillStyle = "#000000";
        context.fillRect(level.x - 4, level.y - 4, levelWidth + 8, levelHeight + 8);

        // Render tiles
        renderTiles();

        // Render clusters
        renderClusters();

        // Render moves, when there are no clusters
        if (showMoves && clusters.length <= 0 && gameState == gameStates.ready) {
            renderMoves();
        }

        // Game Over overlay
        if (gameOver) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x, level.y, levelWidth, levelHeight);

            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            drawCenterText("Game Over!", level.x, level.y + levelHeight / 2 + 10, levelWidth);
        }
    }

    // Draw a frame with a border
    function drawFrame() {
        // Draw background and a border
        context.fillStyle = "#d0d0d0";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#e8eaec";
        context.fillRect(1, 1, canvas.width - 2, canvas.height - 2);
    }

    // Draw buttons
    function drawButtons() {
        for (var i = 0; i < buttons.length; i++) {
            // Draw button shape
            context.fillStyle = "#000000";
            context.fillRect(buttons[i].x, buttons[i].y, buttons[i].width, buttons[i].height);

            // Draw button text
            context.fillStyle = "#ffffff";
            context.font = "18px Verdana";
            var textDim = context.measureText(buttons[i].text);
            context.fillText(buttons[i].text, buttons[i].x + (buttons[i].width - textDim.width) / 2, buttons[i].y + 30);
        }
    }

    // Render tiles
    function renderTiles() {
        for (var i = 0; i < level.columns; i++) {
            for (var j = 0; j < level.rows; j++) {
                // Get the shift of the tile for animation
                var shift = level.tiles[i][j].shift;

                // Calculate the tile coordinates
                var coordinate = getTileCoordinate(i, j, 0, (animationTime / animationTimeTotal) * shift);

                // Check if there is a tile present
                if (level.tiles[i][j].type >= 0) {
                    // Get the color of the tile
                    var col = tileColors[level.tiles[i][j].type];

                    // Draw the tile using the color
                    drawTile(coordinate.tileX, coordinate.tileY, col[0], col[1], col[2]);
                }

                // Draw the selected tile
                if (level.selectedTile.selected) {
                    if (level.selectedTile.column == i && level.selectedTile.row == j) {
                        // Draw a red tile
                        drawTile(coordinate.tileX, coordinate.tileY, 255, 0, 0);
                    }
                }
            }
        }

        // Render the swap animation
        if (gameState == gameStates.resolve && (animationState == 2 || animationState == 3)) {
            // Calculate the x and y shift
            var shiftX = currentMove.column2 - currentMove.column1;
            var shiftY = currentMove.row2 - currentMove.row1;

            // First tile
            var coordinate1 = getTileCoordinate(currentMove.column1, currentMove.row1, 0, 0);
            var coordinate1Shift = getTileCoordinate(currentMove.column1, currentMove.row1, (animationTime / animationTimeTotal) * shiftX, (animationTime / animationTimeTotal) * shiftY);
            var col1 = tileColors[level.tiles[currentMove.column1][currentMove.row1].type];

            // Second tile
            var coordinate2 = getTileCoordinate(currentMove.column2, currentMove.row2, 0, 0);
            var coordinate2Shift = getTileCoordinate(currentMove.column2, currentMove.row2, (animationTime / animationTimeTotal) * -shiftX, (animationTime / animationTimeTotal) * -shiftY);
            var col2 = tileColors[level.tiles[currentMove.column2][currentMove.row2].type];

            // Draw a black background
            drawTile(coordinate1.tileX, coordinate1.tileY, 0, 0, 0);
            drawTile(coordinate2.tileX, coordinate2.tileY, 0, 0, 0);

            // Change the order, depending on the animation state
            if (animationState == 2) {
                // Draw the tiles
                drawTile(coordinate1Shift.tileX, coordinate1Shift.tileY, col1[0], col1[1], col1[2]);
                drawTile(coordinate2Shift.tileX, coordinate2Shift.tileY, col2[0], col2[1], col2[2]);
            } else {
                // Draw the tiles
                drawTile(coordinate2Shift.tileX, coordinate2Shift.tileY, col2[0], col2[1], col2[2]);
                drawTile(coordinate1Shift.tileX, coordinate1Shift.tileY, col1[0], col1[1], col1[2]);
            }
        }
    }

    // Get the tile coordinate
    function getTileCoordinate(column, row, columnOffset, rowOffset) {
        var tileX = level.x + (column + columnOffset) * level.tileWidth;
        var tileY = level.y + (row + rowOffset) * level.tileHeight;
        return {tileX: tileX, tileY: tileY};
    }

    // Draw a tile with a color
    function drawTile(x, y, r, g, b) {
        context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        context.beginPath();
        context.arc(x + 20, y + 20, 14, 0, 2 * Math.PI, false);
        context.fill();
        context.lineWidth = 5;
    }

    // Render clusters
    function renderClusters() {
        for (var i = 0; i < clusters.length; i++) {
            // Calculate the tile coordinates
            var coordinate = getTileCoordinate(clusters[i].column, clusters[i].row, 0, 0);

            if (clusters[i].horizontal) {
                // Draw a horizontal line
                context.fillStyle = "#00ff00";
                context.fillRect(coordinate.tileX + level.tileWidth / 2, coordinate.tileY + level.tileHeight / 2 - 4, (clusters[i].length - 1) * level.tileWidth, 8);
            } else {
                // Draw a vertical line
                context.fillStyle = "#0000ff";
                context.fillRect(coordinate.tileX + level.tileWidth / 2 - 4, coordinate.tileY + level.tileHeight / 2, 8, (clusters[i].length - 1) * level.tileHeight);
            }
        }
    }

    // Render moves
    function renderMoves() {
        for (var i = 0; i < moves.length; i++) {
            // Calculate coordinates of tile 1 and 2
            var coordinate1 = getTileCoordinate(moves[i].column1, moves[i].row1, 0, 0);
            var coordinate2 = getTileCoordinate(moves[i].column2, moves[i].row2, 0, 0);

            // Draw a line from tile 1 to tile 2
            context.strokeStyle = "#ff0000";
            context.beginPath();
            context.moveTo(coordinate1.tileX + level.tileWidth / 2, coordinate1.tileY + level.tileHeight / 2);
            context.lineTo(coordinate2.tileX + level.tileWidth / 2, coordinate2.tileY + level.tileHeight / 2);
            context.stroke();
        }
    }

    // Start a new game
    function newGame() {
        // Reset score
        score = 0;

        // Set the gameState to ready
        gameState = gameStates.ready;

        // Reset game over
        gameOver = false;

        // Create the level
        createLevel();

        // Find initial clusters and moves
        findMoves();
        findClusters();
    }

    // Create a random level
    function createLevel() {
        var done = false;

        // Keep generating levels until it is correct
        while (!done) {

            // Create a level with random tiles
            for (var i = 0; i < level.columns; i++) {
                for (var j = 0; j < level.rows; j++) {
                    level.tiles[i][j].type = getRandomTile();
                }
            }

            // Resolve the clusters
            resolveClusters();

            // Check if there are valid moves
            findMoves();

            // Done when there is a valid move
            if (moves.length > 0) {
                done = true;
            }
        }
    }

    // Get a random tile
    function getRandomTile() {
        return Math.floor(Math.random() * tileColors.length);
    }

    // Remove clusters and insert tiles
    function resolveClusters() {
        // Check for clusters
        findClusters();

        // While there are clusters left
        while (clusters.length > 0) {

            // Remove clusters
            removeClusters();

            // Shift tiles
            shiftTiles();

            // Check if there are clusters left
            findClusters();
        }
    }

    // Find clusters in the level
    function findClusters() {
        // Reset clusters
        clusters = [];

        // Find horizontal clusters
        for (var j = 0; j < level.rows; j++) {
            // Start with a single tile, cluster of 1
            var matchLength = 1;
            for (var i = 0; i < level.columns; i++) {
                var checkCluster = false;

                if (i == level.columns - 1) {
                    // Last tile
                    checkCluster = true;
                } else {
                    // Check the type of the next tile
                    if (level.tiles[i][j].type == level.tiles[i + 1][j].type &&
                        level.tiles[i][j].type != -1) {
                        // Same type as the previous tile, increase matchLength
                        matchLength += 1;
                    } else {
                        // Different type
                        checkCluster = true;
                    }
                }

                // Check if there was a cluster
                if (checkCluster) {
                    if (matchLength >= 3) {
                        // Found a horizontal cluster
                        clusters.push({
                            column: i + 1 - matchLength, row: j,
                            length: matchLength, horizontal: true
                        });
                    }

                    matchLength = 1;
                }
            }
        }

        // Find vertical clusters
        for (var i = 0; i < level.columns; i++) {
            // Start with a single tile, cluster of 1
            var matchLength = 1;
            for (var j = 0; j < level.rows; j++) {
                var checkCluster = false;

                if (j == level.rows - 1) {
                    // Last tile
                    checkCluster = true;
                } else {
                    // Check the type of the next tile
                    if (level.tiles[i][j].type == level.tiles[i][j + 1].type &&
                        level.tiles[i][j].type != -1) {
                        // Same type as the previous tile, increase matchlength
                        matchLength += 1;
                    } else {
                        // Different type
                        checkCluster = true;
                    }
                }

                // Check if there was a cluster
                if (checkCluster) {
                    if (matchLength >= 3) {
                        // Found a vertical cluster
                        clusters.push({
                            column: i, row: j + 1 - matchLength,
                            length: matchLength, horizontal: false
                        });
                    }

                    matchLength = 1;
                }
            }
        }
    }

    // Find available moves
    function findMoves() {
        // Reset moves
        moves = [];

        // Check horizontal swaps
        for (var j = 0; j < level.rows; j++) {
            for (var i = 0; i < level.columns - 1; i++) {
                // Swap, find clusters and swap back
                swap(i, j, i + 1, j);
                findClusters();
                swap(i, j, i + 1, j);

                // Check if the swap made a cluster
                if (clusters.length > 0) {
                    // Found a move
                    moves.push({column1: i, row1: j, column2: i + 1, row2: j});
                }
            }
        }

        // Check vertical swaps
        for (var i = 0; i < level.columns; i++) {
            for (var j = 0; j < level.rows - 1; j++) {
                // Swap, find clusters and swap back
                swap(i, j, i, j + 1);
                findClusters();
                swap(i, j, i, j + 1);

                // Check if the swap made a cluster
                if (clusters.length > 0) {
                    // Found a move
                    moves.push({column1: i, row1: j, column2: i, row2: j + 1});
                }
            }
        }

        // Reset clusters
        clusters = []
    }

    // Loop over the cluster tiles and execute a function
    function loopClusters(func) {
        for (var i = 0; i < clusters.length; i++) {
            //  { column, row, length, horizontal }
            var cluster = clusters[i];
            var columnOffset = 0;
            var rowOffset = 0;
            for (var j = 0; j < cluster.length; j++) {
                func(i, cluster.column + columnOffset, cluster.row + rowOffset, cluster);

                if (cluster.horizontal) {
                    columnOffset++;
                } else {
                    rowOffset++;
                }
            }
        }
    }

    // Remove the clusters
    function removeClusters() {
        // Change the type of the tiles to -1, indicating a removed tile
        loopClusters(function (index, column, row) {
            level.tiles[column][row].type = -1;
        });

        // Calculate how much a tile should be shifted downwards
        for (var i = 0; i < level.columns; i++) {
            var shift = 0;
            for (var j = level.rows - 1; j >= 0; j--) {
                // Loop from bottom to top
                if (level.tiles[i][j].type == -1) {
                    // Tile is removed, increase shift
                    shift++;
                    level.tiles[i][j].shift = 0;
                } else {
                    // Set the shift
                    level.tiles[i][j].shift = shift;
                }
            }
        }
    }

    // Shift tiles and insert new tiles
    function shiftTiles() {
        // Shift tiles
        for (var i = 0; i < level.columns; i++) {
            for (var j = level.rows - 1; j >= 0; j--) {
                // Loop from bottom to top
                if (level.tiles[i][j].type == -1) {
                    // Insert new random tile
                    level.tiles[i][j].type = getRandomTile();
                } else {
                    // Swap tile to shift it
                    var shift = level.tiles[i][j].shift;
                    if (shift > 0) {
                        swap(i, j, i, j + shift)
                    }
                }

                // Reset shift
                level.tiles[i][j].shift = 0;
            }
        }
    }

    // Get the tile under the mouse
    function getMouseTile(pos) {
        // Calculate the index of the tile
        var tx = Math.floor((pos.x - level.x) / level.tileWidth);
        var ty = Math.floor((pos.y - level.y) / level.tileHeight);

        // Check if the tile is valid
        if (tx >= 0 && tx < level.columns && ty >= 0 && ty < level.rows) {
            // Tile is valid
            return {
                valid: true,
                x: tx,
                y: ty
            };
        }

        // No valid tile
        return {
            valid: false,
            x: 0,
            y: 0
        };
    }

    // Check if two tiles can be swapped
    function canSwap(x1, y1, x2, y2) {
        // Check if the tile is a direct neighbor of the selected tile
        if ((Math.abs(x1 - x2) == 1 && y1 == y2) ||
            (Math.abs(y1 - y2) == 1 && x1 == x2)) {
            return true;
        }

        return false;
    }

    // Swap two tiles in the level
    function swap(x1, y1, x2, y2) {
        var typeSwap = level.tiles[x1][y1].type;
        level.tiles[x1][y1].type = level.tiles[x2][y2].type;
        level.tiles[x2][y2].type = typeSwap;
    }

    // Swap two tiles as a player action
    function mouseSwap(c1, r1, c2, r2) {
        // Save the current move
        currentMove = {column1: c1, row1: r1, column2: c2, row2: r2};

        // Deselect
        level.selectedTile.selected = false;

        // Start animation
        animationState = 2;
        animationTime = 0;
        gameState = gameStates.resolve;
    }

    // On mouse movement
    function onMouseMove(e) {
        // Get the mouse position
        var pos = getMousePos(canvas, e);

        // Check if we are dragging with a tile selected
        var mouseTile;
        if (drag && level.selectedTile.selected) {
            // Get the tile under the mouse
            mouseTile = getMouseTile(pos);
            if (mouseTile.valid) {
                // Valid tile

                // Check if the tiles can be swapped
                if (canSwap(mouseTile.x, mouseTile.y, level.selectedTile.column, level.selectedTile.row)) {
                    // Swap the tiles
                    mouseSwap(mouseTile.x, mouseTile.y, level.selectedTile.column, level.selectedTile.row);
                }
            }
        }
    }

    // On mouse button click
    function onMouseDown(e) {
        // Get the mouse position
        var pos = getMousePos(canvas, e);

        // Start dragging
        var mouseTile;
        if (!drag) {
            // Get the tile under the mouse
            mouseTile = getMouseTile(pos);

            if (mouseTile.valid) {
                // Valid tile
                var swapped = false;
                if (level.selectedTile.selected) {
                    if (mouseTile.x == level.selectedTile.column && mouseTile.y == level.selectedTile.row) {
                        // Same tile selected, deselect
                        level.selectedTile.selected = false;
                        drag = true;
                        return;
                    } else if (canSwap(mouseTile.x, mouseTile.y, level.selectedTile.column, level.selectedTile.row)) {
                        // Tiles can be swapped, swap the tiles
                        mouseSwap(mouseTile.x, mouseTile.y, level.selectedTile.column, level.selectedTile.row);
                        swapped = true;
                    }
                }

                if (!swapped) {
                    // Set the new selected tile
                    level.selectedTile.column = mouseTile.x;
                    level.selectedTile.row = mouseTile.y;
                    level.selectedTile.selected = true;
                }
            } else {
                // Invalid tile
                level.selectedTile.selected = false;
            }

            // Start dragging
            drag = true;
        }

        // Check if a button was clicked
        for (var i = 0; i < buttons.length; i++) {
            if (pos.x >= buttons[i].x && pos.x < buttons[i].x + buttons[i].width &&
                pos.y >= buttons[i].y && pos.y < buttons[i].y + buttons[i].height) {

                // Button i was clicked
                if (i == 0) {
                    // New Game
                    newGame();
                } else if (i == 1) {
                    // Show Moves
                    showMoves = !showMoves;
                    buttons[i].text = (showMoves ? "Hide" : "Show") + " Moves";
                } else if (i == 2) {
                    // AI Bot
                    aiBot = !aiBot;
                    buttons[i].text = (aiBot ? "Disable" : "Enable") + " AI Bot";
                }
            }
        }
    }

    function onMouseUp() {
        // Reset dragging
        drag = false;
    }

    function onMouseOut() {
        // Reset dragging
        drag = false;
    }

    // Get the mouse position
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
            y: Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
        };
    }

    // Call init to start the game
    init();
};