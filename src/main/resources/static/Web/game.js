var game = new Vue({
    el: "#game",
    data: {
        data: [],
        userId: "",
        //In game variables
        userNickName: "",
        enemyNickName: "Waiting for Enemy",
        userSalvos: [],
        enemySalvos: [],
        enemyTable: [],
        enemySunkShips: [],
        userSunkShips: [],
        //Placing Ships
        placingShips: true,
        shipsToPlace: [],
        selectedShip: "",
        errorOutSide: false,
        errorOverLapping: false,
        //Fireing Salvoes
        salvoLocations: [],
        //Static Arrays
        alphabet: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
        numbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        alphaNumeric: [],
        //Game Logic
        waitingForOponent: true,
        myTurn: false,
        gameFinished: false,
        counter: 0,
        gameStatus:"",
        
        
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
            const alphabet = this.alphabet;
            const numbers = this.numbers
            for (let i = 0; i < alphabet.length; i++) {
                for (let j = 0; j < numbers.length; j++) {
                    let element = alphabet[i] + numbers[j];
                    array.push(element);
                }
            }
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
        //Print Data
        printNickName: function () {
            let gameplayers = this.data.game.gameplayers;
            for (let i = 0; i < gameplayers.length; i++) {
                if (gameplayers[i].gameplayer_id == this.userId) {
                    this.userNickName = gameplayers[i].player.player_username;
                } else {
                    if (gameplayers[i].player == null) {
                        this.enemyNickName = "Waiting for enemy"
                    } else {
                        this.enemyNickName = gameplayers[i].player.player_username;
                    }
                }
            }
        },
        printShips: function (array, letter) {
            let ships = array;
            let shipsToPrint = [];
            for (let i = 0; i < ships.length; i++) {
                let location = ships[i].location;
                let type = ships[i].type.toLocaleLowerCase();
                let direction = this.detectShipDirection(location);
                for (let j = 0; j < location.length; j++) {
                    let shipLocation = location[j];
                    let shipCell = document.getElementById(letter + shipLocation);
                    shipCell.classList.add("ship-location");
                    shipCell.classList.add(type + "-" + j + "-" + direction);
                    shipCell.setAttribute("data-type", type);
                }
            }
        },
        printSalvos: function (salvos, letter) {
            for (var i = 0; i < salvos.length; i++) {
                var salvo = salvos[i];
                var turn = salvo.turn;
                var shots = salvo.location;
                for (var j = 0; j < shots.length; j++) {
                    var shot = shots[j];
                    var cell = document.getElementById(letter + shot);
                    if (cell.classList.contains("ship-location")) {
                        cell.setAttribute("class", "hitted");

                    } else {
                        cell.setAttribute("class", "fail");
                    }
                    cell.innerHTML = salvo.turn;
                }
            }
        },
        printHits: function (allHits) {
            for (let i = 0; i < allHits.length; i++) {
                let hits = allHits[i];
                for (let j = 0; j < hits.length; j++) {
                    var shot = hits[j];
                    var cell = document.getElementById("E" + shot);
                    cell.setAttribute("class", "hitted");
                }
            }
        },
        //Place Ships
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

            let loop;
            let type;
            let locationArray = [];

            if (ship.id == "destroyer") {
                loop = 4;
                type = "destroyer";
            }
            if (ship.id == "cruiser") {
                loop = 3;
                type = "cruiser";
            }
            if (ship.id == "submarine") {
                loop = 3;
                type = "submarine";
            }
            if (ship.id == "boat") {
                loop = 2;
                type = "boat";
            }

            //Create the ship Object
            let letter = selectedCell.id.charAt(1);
            let number = parseFloat(selectedCell.id.charAt(2));
            locationArray.push(letter + number)
            for (let i = 0; i < loop; i++) {
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

            for (let i = 0; i < this.shipsToPlace.length; i++) {
                if (this.shipsToPlace[i].type == newShip.type) {
                    var index = this.shipsToPlace.indexOf(this.shipsToPlace[i]);
                    if (index > -1) {
                        this.shipsToPlace.splice(index, 1);
                    }
                }
            }
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
            let selectedShip = this.selectedShip.id;
            let oldShip = document.querySelectorAll("[data-type='" + selectedShip + "']")
            for (let i = 0; i < oldShip.length; i++) {
                oldShip[i].setAttribute("class", "none-border-cell");
            }

        },
        placeingRules: function (array) {
            let allLocations = [];
            for (let i = 0; i < array.length; i++) {
                let eachShip = array[i];
                let type = eachShip.type;
                let location = eachShip.location;
                for (let j = 0; j < location.length; j++) {
                    if (!this.alphaNumeric.includes(location[j])) {
                        var index = array.indexOf(eachShip);
                        if (index > -1) {
                            array.splice(index, 1);
                        }
                    } else {
                        if (allLocations.includes(location[j])) {
                            var index = array.indexOf(eachShip);
                            if (index > -1) {
                                array.splice(index, 1);
                            }
                        } else {
                            allLocations.push(location[j])
                        }
                    }
                }
            }
            return array;
        },
        rotateShip: function (shipId) {
            let ship = document.getElementById(shipId);
            if (ship.classList.contains("h")) {
                ship.classList.remove("h");
                ship.classList.add("v");
            } else {
                ship.classList.remove("v");
                ship.classList.add("h");
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
        //Fire Salvoes
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
            var allCells = this.salvoLocations;
            var cell = document.getElementById(cellId);
            if (!cell.classList.contains("shot")) {
                if (allCells.length == 4) {
                    var cellRemoved = allCells.splice(0, 1);
                    cellRemoved[0].classList.remove("shot");
                }
                allCells.push(cell);
                cell.classList.add("shot");
            } else {
                cell.classList.remove("shot");
            }
        },
        locationsToPost: function () {
            let cells = this.salvoLocations;
            let locations = [];
            for (let i = 0; i < cells.length; i++) {
                let cellId = cells[i].id;
                let location = cellId.charAt(1) + cellId.charAt(2);
                locations.push(location);
            }
            return locations;
        },
        //See sunk ships
        printSunk: function (array) {
            var sunkShips = [];
            for (let i = 0; i < array.length; i++) {
                if (array[i].sunk) {
                    let locations = array[i]["ship-location"]
                    for (let j = 0; j < locations.length; j++) {
                        sunkShips.push(locations[j]);
                    }
                }
            }
            return sunkShips;
        },
        addSunkClass: function (array, letter) {
            for (let i = 0; i < array.length; i++) {
                document.getElementById(letter + array[i]).setAttribute("class", "sunk");
            }
        },
        gameEnded: function (gameplayers) {
            for (let i = 0; i < gameplayers.length; i++) {
                if (gameplayers[i].score != null) {
                    this.gameFinished = true;
                }
            }
        },
        countSunks: function (array) {
            let counter = 0;
            for (var i = 0; i < array.length; i++) {
                if (array[i].sunk ==  true) {
                    counter++
                }
            }
            return counter;
        },
        allShipsSunk:  function () {
            var userTurn  = this.data.user_turn;
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
