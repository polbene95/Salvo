var game = new Vue({
    el: "#game",
    data: {
        data: [],
        userId: "",
        userNickName: "",
        enemyNickName: "Waiting for Enemy",
        userSalvos: [],
        enemySalvos: [],
        enemyTable: [],
        enemySunkShips: [],
        userSunkShips: [],
        placingShips: true,
        shipsToPlace: [],
        selectedShip: "",
        errorOutSide: false,
        errorOverLapping: false,
        salvoLocations: [],
        alphabet: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
        numbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        alphaNumeric: [],
        waitingForOponent: true,
        myTurn: false,
        gameFinished: false,
        counter: 0,
        gameStatus: "",
    },
    created: function () {
        this.getURL();
        this.getData();
    },
    methods: {
        getURL: function () {
            this.userId = location.search.split("=")[1];
        },
        getData: function () {
            fetch("/api/game_view/" + this.userId, {
                    method: "GET",
                    credentials: "include",
                })
                .then(r => r.json())
                .then(json => {
                    game.data = json.game_view;
                    game.alphaNumeric = game.fillTable();
                    game.printNickName();
                    game.salvoLocations = [];
                    game.gameEnded(game.data.game.gameplayers);

                    if (!game.gameFinished) {
                        game.allShipsSunk();
                        game.gameLogic();
                    } else {
                        game.gameLogic();
                        game.gameOver();
                    }
                })
                .catch(e => console.log(e))
        },
        gameLogic: function () {
            if (this.data.ships.length != 0) {
                this.placingShips = false;
                this.userShips = this.data.ships;
                this.printShips(this.userShips, "U");
            }
            if (this.data.user_salvos.length != 0) {
                this.userSalvos = this.data.user_salvos;
                this.printSalvos(this.userSalvos, "E");
            }
            if (this.data.game.gameplayers.length == 2) {
                this.waitingForOponent = false;
                this.myTurn = this.data.my_turn;
                if (this.data.enemy_salvos.length != 0) {
                    this.enemySalvos = this.data.enemy_salvos;
                    this.printSalvos(this.enemySalvos, "U");
                }
                if (this.data.hits.length != 0) {
                    this.printHits(this.data.hits)
                }
                this.enemySunkShips = this.printSunk(this.data.enemy_ship_status);
                this.userSunkShips = this.printSunk(this.data.user_ship_status);
                this.addSunkClass(this.enemySunkShips, "E")
                this.addSunkClass(this.userSunkShips, "U")
            }
            if (!this.myTurn && !this.gameFinished) {
                setTimeout(this.getData(), 2000);
            }
        },
        fillTable: function () {
            let array = [];
            this.alphabet.map(a => game.numbers.map(n => array.push(a + n)))
            return array;
        },
        logout: function () {
            fetch("/api/logout", {
                    credentials: 'include',
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                })
                .then(r => {
                    window.location.replace("/Web/games.html");
                })
                .catch(e => console.log(e))
        },
        printNickName: function () {
            this.data.game.gameplayers.forEach(gameplayer => {
                if (gameplayer.gameplayer_id == game.userId) {
                    game.userNickName = gameplayer.player.player_username;
                } else {
                    if (gameplayer.player == null) {
                        game.enemyNickName = "Waiting for enemy"
                    } else {
                        game.enemyNickName = gameplayer.player.player_username;
                    }
                }
            })
        },
        printShips: function (ships, letter) {
            ships.forEach(ship => {
                let location = ship.location;
                let type = ship.type.toLocaleLowerCase();
                let direction = game.detectShipDirection(location);
                location.forEach((cell, i) => {
                    let shipLocation = cell;
                    let shipCell = document.getElementById(letter + cell);
                    shipCell.classList.add("ship-location");
                    shipCell.classList.add(type + "-" + i + "-" + direction);
                    shipCell.setAttribute("data-type", type);
                })
            })
        },
        printSalvos: function (salvos, letter) {
            salvos.forEach(salvo => salvo.location
                .forEach(shot => {
                    let cell = document.getElementById(letter + shot);
                    if (cell.classList.contains("ship-location")) {
                        cell.setAttribute("class", "hitted");
                    } else {
                        cell.setAttribute("class", "fail");
                    }
                    cell.innerHTML = salvo.turn;
                })
            )
        },
        printHits: function (allHits) {
            allHits
                .forEach(hits => hits
                    .forEach(shot => document.getElementById("E" + shot).setAttribute("class", "hitted")))
        },
        detectShipDirection: function (array) {
            let direction;
            if (array[0].charAt(0) == array[1].charAt(0)) {
                direction = "hor"
            } else {
                direction = "ver"
            }
            return direction;
        },
        shipSelected: function (ship) {
            this.removeSelectedClass();
            let selectedShip = document.getElementById(ship);
            this.selectedShip = selectedShip;
            if (!selectedShip.classList.contains("selected-ship")) {
                selectedShip.classList.add("selected-ship")
            } else {
                selectedShip.classList.remove("selected-ship")
            }

        },
        removeSelectedClass: function () {
            document.getElementById("destroyer").classList.remove("selected-ship");
            document.getElementById("cruiser").classList.remove("selected-ship");
            document.getElementById("submarine").classList.remove("selected-ship");
            document.getElementById("boat").classList.remove("selected-ship");
        },
        placeShipInTheGrid: function (cellId) {
            let ship = document.getElementsByClassName("selected-ship")[0];
            let selectedCell = document.getElementById(cellId);

            let loops;
            let type;
            let locationArray = [];

            if (ship.id == "destroyer") {
                loops = 4;
                type = "destroyer";
            }
            if (ship.id == "cruiser") {
                loops = 3;
                type = "cruiser";
            }
            if (ship.id == "submarine") {
                loops = 3;
                type = "submarine";
            }
            if (ship.id == "boat") {
                loops = 2;
                type = "boat";
            }

            let letter = selectedCell.id.charAt(1);
            let number = parseFloat(selectedCell.id.charAt(2));
            locationArray.push(letter + number)
            for (let i = 0; i < loops; i++) {
                if (ship.classList.contains("h")) {
                    number++;
                    locationArray.push(letter + number)
                } else {
                    letter = this.alphabet[this.alphabet.indexOf(letter) + 1];
                    locationArray.push(letter + number);
                }
            }

            let newShip = {
                type: type,
                location: locationArray,
            }

            this.shipsToPlace.forEach(ship => {
                if (ship.type == newShip.type) {
                    var index = this.shipsToPlace.indexOf(ship);
                    if (index > -1) {
                        this.shipsToPlace.splice(index, 1);
                    }
                }
            });

            this.shipsToPlace.push(newShip)
            this.placeingRules(this.shipsToPlace)

        },
        selectCell: function (cellId) {
            let selectedCell = document.getElementById(cellId);
            if (!selectedCell.classList.contains("ship-location")) {
                this.placeShipInTheGrid(cellId);
                this.removeOldShip();
                this.printShips(this.shipsToPlace, "P");
            }
        },
        removeOldShip: function () {
            document.querySelectorAll("[data-type='" + this.selectedShip.id + "']")
                .forEach(ship => ship.setAttribute("class", "none-border-cell"));
        },
        placeingRules: function (array) {
            let allLocations = [];
            array
                .forEach(eachShip => eachShip.location
                    .forEach(location => {
                        if (!this.alphaNumeric.includes(location)) {
                            let index = array.indexOf(eachShip);
                            if (index > -1) {
                                array.splice(index, 1);
                            }
                        } else {
                            if (allLocations.includes(location)) {
                                let index = array.indexOf(eachShip);
                                if (index > -1) {
                                    array.splice(index, 1);
                                }
                            } else {
                                allLocations.push(location)
                            }
                        }
                    })
                )
            return array;
        },
        rotateShip: function (shipId) {
            let ship = document.getElementById(shipId);
            this.setShipsDirectionToHoritzontal(ship);
            if (ship.classList.contains("h")) {
                ship.classList.remove("h");
                ship.classList.add("v");
            } else {
                ship.classList.remove("v");
                ship.classList.add("h");
            }
        },
        setShipsDirectionToHoritzontal(selectedShip) {
            const ships = document.getElementsByClassName("ship-creation");
            for (let i = 0; i < ships.length; i++) {
                let ship = ships[i];
                if (ship != selectedShip) {
                    ship.classList.remove("v");
                    ship.classList.add("h");
                }
            }


        },
        postShips: function () {
            if (this.shipsToPlace.length == 4) {
                fetch("/api/games/players/" + this.userId + "/ships", {
                        credentials: 'include',
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(this.shipsToPlace),
                    })
                    .then(r => game.getData())
                    .catch(e => console.log(e))
            } else {
                alert("Error: Place all ships")
            }
        },
        postSalvoes: function () {
            let locations = this.locationsToPost();
            fetch("/api/games/players/" + this.userId + "/salvoes", {
                    credentials: 'include',
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        location: locations,
                    }),
                })
                .then(r => {
                    if (r.status == 201) {
                        game.getData();
                    }
                })
                .catch(e => console.log(e))
        },
        selectCellToShot: function (cellId) {
            let allCells = this.salvoLocations;
            let cell = document.getElementById(cellId);
            if (!cell.classList.contains("shot")) {
                if (allCells.length == 4) {
                    let cellRemoved = allCells.splice(0, 1);
                    cellRemoved[0].classList.remove("shot");
                }
                allCells.push(cell);
                cell.classList.add("shot");
            } else {
                let index = allCells.indexOf(cell);
                if (index > -1) {
                    allCells.splice(index, 1);
                }
                cell.classList.remove("shot");
            }
        },
        locationsToPost: function () {
            let locations = [];
            this.salvoLocations
                .forEach(cell => locations.push(cell.id.charAt(1) + cell.id.charAt(2)))
            return locations;
        },
        printSunk: function (array) {
            var sunkShips = [];
            array
                .filter(ship => ship.sunk)
                .map(ship => ship["ship-location"].forEach(cell => sunkShips.push(cell)))
            return sunkShips;
        },
        addSunkClass: function (array, letter) {
            array.forEach(cell => document.getElementById(letter + cell).setAttribute("class", "sunk"))
        },
        gameEnded: function (gameplayers) {
            gameplayers.forEach(gameplayer => {
                if (gameplayer.score != null)
                    game.gameFinished = true;
            })
        },
        countSunks: function (array) {
            let counter = 0;
            for (var i = 0; i < array.length; i++) {
                if (array[i].sunk == true) {
                    counter++
                }
            }
            return counter;
        },
        allShipsSunk: function () {
            var userTurn = this.data.user_turn;
            var enemyTurn = this.data.enemy_turn;
            if (userTurn == enemyTurn) {
                if (this.countSunks(this.data.user_ship_status) == 4 || this.countSunks(this.data.enemy_ship_status) == 4) {
                    this.getData();
                }
            }
        },
        gameOver: function () {
            console.log(this.data.user_score)
            if (this.data.user_score == 1) {
                this.gameStatus = "You win"
            } else if (this.data.user_score == 0) {
                this.gameStatus = "You lose"
            } else {
                this.gameStatus = "It's a tie"
            }

        },
    },
})
