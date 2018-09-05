const games = new Vue({
    el: "#games",
    data: {
        gamesURL: "/api/games",
        leaderboardURL: "/api/leaderboard",
        leaderboardJSON: {},
        gamesJSON: {},
        games: [],
        userName: "",
        userLoged: false,
        currentTable: 0,
        alertLogin: false,
        error: "",
    },
    created: function () {
        this.getLeaderboardData();
        this.getAllGamesData();
    },
    methods: {
        userLogedIn: function () {
            if (this.userName == "") {
                this.userLoged = false;
            } else {
                this.userLoged = true;
            }
        },
        getAllGamesData: function () {
            fetch("/api/games", {
                    method: "GET",
                    credentials: "include",
                })
                .then(r => r.json())
                .then(json => {
                    if (json.games) {
                        games.gamesJSON = json.games;
                        games.userName = json.user;
                        games.userLogedIn();
                        games.gamesDataTable();
                    }
                })
                .catch(e => console.log(e))

        },
        getLeaderboardData: function () {
            fetch("/api/leaderboard", {
                    method: "GET",
                    credentials: "include",
                })
                .then(r => r.json())
                .then(json => {
                    games.leaderboardJSON = json.sort((a,b) => b.total_score - a.total_score);
                })
                .catch(e => console.log(e))
        },
        //Buttons Functions
        login: function () {
            let username = document.getElementById("username").value;
            let password = document.getElementById("password").value;
            fetch("/api/login", {
                    credentials: 'include',
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'userName=' + username + '&password=' + password,
                })
                .then(r => {
                    if (r.status == 200) {
                        games.userLoged = true;
                        games.alertLogin = false;
                        games.getAllGamesData()
                    } else {
                        games.alertLogin = true;
                        games.error = "Username or Password are wrong";
                    }
                })
                .catch(e => console.log(e))
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
                    games.userLoged = false;
                    games.currentTable = 0;
                    games.gamesJSON = {}
                })
                .catch(e => console.log(e))
        },
        signup: function () {
            let username = document.getElementById("username").value;
            let password = document.getElementById("password").value;
            fetch("/api/players", {
                    credentials: 'include',
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'userName=' + username + '&password=' + password,
                })
                .then(r => {
                    console.log(r)
                    if (r.status == 201) {
                        games.alertLogin = false;
                        games.login()
                        games.getLeaderboardData()
                    } else {
                        games.alertLogin = true;
                        games.error = "User already exist";
                    }

                })
                .catch(e => console.log(e))
        },
        createGame: function () {
            fetch("/api/games", {
                    credentials: 'include',
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                .then(response => response.json())
                .then(json => location.replace("/web/game.html?gp=" + json.id))
                .catch(error => console.log(error))
        },
        joinGame: function (gameId) {
            fetch("/api/game/" + gameId + "/players", {
                    credentials: 'include',
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                })
                .then(response => response.json())
                .then(json => location.replace("/web/game.html?gp=" + json.id))
                .catch(e => console.log(e))
        },
        changeTable: function () {
            if (this.currentTable == 0) {
                this.currentTable = 1;
            } else {
                this.currentTable = 0;
            }
        },
        gamesDataTable: function () {
            let array = [];
            let games = this.gamesJSON;
            console.log(games);
            for (let i = 0; i < games.length; i++) {

                let gamePlayers = games[i].gameplayers;
                let gameId = games[i].game_id;
                let myGamePlayerId;
                let playerOne = gamePlayers[0].player.player_username;
                let playerTwo;

                if (gamePlayers.length > 1) {
                    playerTwo = gamePlayers[1].player.player_username;
                } else {
                    playerTwo = "-"
                }

                if (playerOne == this.userName) {
                    myGamePlayerId = gamePlayers[0].gameplayer_id;
                }
                if (gamePlayers.length > 1 && playerTwo == this.userName) {
                    myGamePlayerId = gamePlayers[1].gameplayer_id;
                }
                let object = {
                    gameId: gameId,
                    playerOne: playerOne,
                    playerTwo: playerTwo,
                    id: myGamePlayerId,
                    players: gamePlayers.length
                };
                array.push(object);
            }
            this.games = array;

        }
    },
})
