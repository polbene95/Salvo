package salvo.salvo;

import com.sun.org.apache.xpath.internal.operations.Bool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import javax.persistence.criteria.CriteriaBuilder;
import java.util.*;

import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toSet;

@RestController
@RequestMapping("/api")
public class SalvoController {

    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private GamePlayerRepository gamePlayerRepository;
    @Autowired
    private ShipRepository shipRepository;
    @Autowired
    private SalvoRepository salvoRepository;
    @Autowired
    private ScoreRepository scoreRepository;

    @RequestMapping(path="/games", method = RequestMethod.GET)
    private Map<String,Object> listOfGames (Authentication authentication) {
        Map<String,Object> gameMap = new LinkedHashMap<>();
        if (authentication != null) {
            List<Object> gamesList = new ArrayList<>();
            List<Game> gameRepo = gameRepository.findAll();

            for (Game game : gameRepo) {
                if (game.getGamePlayer().getScores() == null) {
                gamesList.add(getGame(game));
                }
            }
            gameMap.put("user",authentication.getName());
            gameMap.put("games", gamesList);
        } else {
            gameMap.put("error", "login");
        }
        return gameMap;
    }

    @RequestMapping(path = "/games", method = RequestMethod.POST)
    private ResponseEntity<Map<String,Object>> createGame (Authentication authentication) {
        if (authentication != null) {
            String userName = authentication.getName();
            Player player = playerRepository.findByUserName(userName).get(0);
            //playerRepository.save(player);
            Game game = new Game();
            gameRepository.save(game);
            GamePlayer gamePlayer = new GamePlayer(player, game);
            gamePlayerRepository.save(gamePlayer);

            return new ResponseEntity<>(makeMap("id",gamePlayer.getId()),HttpStatus.CREATED);
        } else if (authentication == null) {
            return new ResponseEntity<>(makeMap("error","log in"), HttpStatus.UNAUTHORIZED);
        } else {
            return  new ResponseEntity<Map<String, Object>>(makeMap("error","error"),HttpStatus.FORBIDDEN);
        }
    }

    @RequestMapping(path = "/game/{id}/players", method = RequestMethod.POST)
    private ResponseEntity<Map<String,Object>> joinGame (@PathVariable Long id,
                                                        Authentication authentication) {
        if (authentication != null) {
            String userName = authentication.getName();
            Player player = playerRepository.findByUserName(userName).get(0);
            Game game = gameRepository.findOne(id);
            GamePlayer gamePlayer = new GamePlayer(player, game);
            gamePlayerRepository.save(gamePlayer);
            return new ResponseEntity<Map<String, Object>>(makeMap("id", gamePlayer.getId()), HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>(makeMap("error","Log in"), HttpStatus.UNAUTHORIZED);
        }
    }

    @RequestMapping(path="/game_view/{gamePlayerId}",method = RequestMethod.GET)
    private ResponseEntity<Map<String,Object>> gameView (@PathVariable Long gamePlayerId,
                                                         Authentication authentication) {
        GamePlayer gamePlayer = gamePlayerRepository.findOne(gamePlayerId);
        Player currentPlayer = playerRepository.findByUserName(authentication.getName()).get(0);
        Player player = gamePlayer.getPlayer();
        if (currentPlayer.getId() == player.getId()) {
            Map<String,Object> gameViewMap = new LinkedHashMap<>();
            if (gamePlayer.getGame().getGamePlayers().size() == 2) {
                GamePlayer enemy = enemyGamePlayer(gamePlayer);
                sinkShip(gamePlayer);
                sinkShip(enemy);
                if (gamePlayer.getScores() == null) {
                    allSunk(gamePlayer, getLastTurn(gamePlayer), getLastTurn(enemy));
                }
                gameViewMap.put("enemy_salvos", getSalvoInfo(enemy));
                gameViewMap.put("enemy_ship_status", enemy.getShips()
                        .stream()
                        .map(ship -> shipStatus(ship))
                        .collect(toList()));
                gameViewMap.put("hits", gamePlayer.getSalvos()
                        .stream()
                        .map(salvo -> getHits(salvo))
                        .collect(toList()));
                gameViewMap.put("enemy_turn", getLastTurn(enemy));
                if (enemy.getScores() != null)
                gameViewMap.put("enemy_score", enemy.getScores().getScore());
                gameViewMap.put("my_turn", displayTurn(gamePlayer));
            }
            gameViewMap.put("user_id", gamePlayerId);
            gameViewMap.put("game", getGame(gamePlayer.getGame()));
            gameViewMap.put("ships", gamePlayer.getShips()
                    .stream()
                    .map(ship -> getShipInfo(ship))
                    .collect(toList()));
            gameViewMap.put("user_salvos", getSalvoInfo(gamePlayer));
            gameViewMap.put("user_ship_status", gamePlayer.getShips()
                    .stream()
                    .map(ship -> shipStatus(ship))
                    .collect(toList()));
            gameViewMap.put("user_turn", getLastTurn(gamePlayer));
            if (gamePlayer.getScores() != null)
            gameViewMap.put("user_score", gamePlayer.getScores().getScore());

            return new ResponseEntity<Map<String, Object>>(makeMap("game_view", gameViewMap),HttpStatus.OK);
        } else {
            return new ResponseEntity<Map<String, Object>>(makeMap("error","wrong gameplayer"),HttpStatus.UNAUTHORIZED);
        }
    }

    @RequestMapping(path="/leaderboard", method = RequestMethod.GET)
    private List<Map<String,Object>> leaderBoard() {
        List<Map<String,Object>> scoreList = new ArrayList<>();
        List<Player> players = playerRepository.findAll();
        for (Player player : players) {
            Integer wins = 0;
            Integer lose = 0;
            Integer ties = 0;
            Double totalScore = 0.0;
            Set<Score> scores = player.getScores();
            for (Score score : scores) {

                if (score.getScore() == 1) {
                    wins += 1;
                }
                if (score.getScore() == 0) {
                    lose += 1;
                }
                if (score.getScore() == 0.5) {
                    ties += 1;
                }
                totalScore += score.getScore();

            }
            Map<String, Object> scoreMap = new LinkedHashMap<>();
            scoreMap.put("player_id", player.getId());
            scoreMap.put("player_username", player.getUserName());
            scoreMap.put("total_score", totalScore);
            scoreMap.put("win", wins);
            scoreMap.put("lose", lose);
            scoreMap.put("tie", ties);
            scoreList.add(scoreMap);
        }
        return scoreList;
    }

    @RequestMapping(path="/players",method = RequestMethod.POST)
    private ResponseEntity<Map<String,Object>> createPlayer (String userName,
                                                            String password) {
        if (userName.isEmpty()){
            return new ResponseEntity<>(makeMap("error","No name given"), HttpStatus.FORBIDDEN);
        }
        if (password.isEmpty()){
            return new ResponseEntity<>(makeMap("error","No password given"),HttpStatus.FORBIDDEN);
        }
        List<Player> player = playerRepository.findByUserName(userName);
        if (!player.isEmpty()) {
            return new ResponseEntity<>(makeMap("error","Username already used"), HttpStatus.CONFLICT);
        }
        Player newPlayer = new Player(userName,password);
        playerRepository.save(newPlayer);
        return new ResponseEntity<>(makeMap("id",newPlayer.getId()), HttpStatus.CREATED);
    }

    @RequestMapping(path="/games/players/{gamePlayerId}/ships", method = RequestMethod.POST)
    private ResponseEntity<Map<String,Object>> placeShips (@PathVariable Long gamePlayerId,
                                                          @RequestBody Set<Ship> ships,
                                                          Authentication authentication){
        if (authentication != null) {
            GamePlayer gamePlayer = gamePlayerRepository.findOne(gamePlayerId);
            for (Ship ship : ships) {
                ship.setGamePlayer(gamePlayer);
                shipRepository.save(ship);
            }
            return new ResponseEntity<>(makeMap("succed", "ship created"),HttpStatus.CREATED);
        }
        else {
            return new ResponseEntity<Map<String, Object>>(makeMap("error", "forbidden"), HttpStatus.FORBIDDEN);
        }
    }

    @RequestMapping(path = "/games/players/{gamePlayerId}/salvoes",method = RequestMethod.POST)
    private ResponseEntity<Map<String,Object>> postSalvoes (@PathVariable Long gamePlayerId,
                                                           @RequestBody Salvo salvo,
                                                           Authentication authentication) {

        if (authentication != null) {
            GamePlayer gamePlayer = gamePlayerRepository.findOne(gamePlayerId);
            Boolean myTurn = displayTurn(gamePlayer);
            if (myTurn) {
                if (!checkShotLocations(gamePlayer, salvo)) {
                    Integer turn = getLastTurn(gamePlayer);
                    salvo.setTurn(turn);
                    salvo.setGamePlayer(gamePlayer);
                    salvoRepository.save(salvo);

                    return new ResponseEntity<>(makeMap("succed", "salvo created"), HttpStatus.CREATED);
                } else {
                    return new ResponseEntity<>(makeMap("error", "already shot there"), HttpStatus.FORBIDDEN);
                }
            } else {
                return new ResponseEntity<Map<String, Object>>(makeMap("error", "not your turn"),HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(makeMap("error","forbidden"),HttpStatus.FORBIDDEN);
        }
    }

    private GamePlayer enemyGamePlayer (GamePlayer gamePlayer) {
        Set<GamePlayer> gamePlayers = gamePlayer.getGame().getGamePlayers();
        List<GamePlayer> gamePlayerList = new ArrayList<>();
        for (GamePlayer gp : gamePlayers) {
            if (gp.getId() != gamePlayer.getId()){
                gamePlayerList.add(gp);
            }
        }
        GamePlayer enemyGamePlayer = gamePlayerList.get(0);
        return enemyGamePlayer;
    }

    private Integer getLastTurn (GamePlayer gamePlayer) {
        Set<Salvo> salvoSet = gamePlayer.getSalvos();
        Integer lastTurn = 0;
        for (Salvo salvo : salvoSet) {
            Integer turn = salvo.getTurn();
            if (turn > lastTurn) {
                lastTurn = turn;
            }
        }
        return lastTurn + 1;
    }

    private Boolean displayTurn (GamePlayer gamePlayer) {
        GamePlayer user = gamePlayer;
        GamePlayer enemy = enemyGamePlayer(gamePlayer);
        Integer userTurn = getLastTurn(user);
        Integer enemyTurn = getLastTurn(enemy);

        Boolean myTurn;


        if (userTurn < enemyTurn ) {
            myTurn = true;
        } else if  (userTurn > enemyTurn) {
            myTurn = false;
        } else {
            if (user.getId() > enemy.getId()) {
                myTurn = true;
            } else {
                myTurn = false;
            }
        }
        return myTurn;
    }

    private Boolean checkShotLocations (GamePlayer gamePlayer, Salvo newSalvo) {
        Set<Salvo> salvos = gamePlayer.getSalvos();
        List<String> allLocations = new ArrayList<>();
        Boolean shotArea = false;
        for (Salvo salvo : salvos) {
            List<String> locations = salvo.getLocation();
            for (String location : locations) {
                    allLocations.add(location);
            }
        }
        for (String newLocation : newSalvo.getLocation()) {
            if (allLocations.contains(newLocation)){
                shotArea = true;
            }
        }
        return shotArea;
    }

    private List<String> getShipLocations (GamePlayer gamePlayer) {
        Set<Ship> ships = gamePlayer.getShips();
        return ships.stream()
                .map(ship -> ship.getLocation())
                .flatMap(location -> location.stream())
                .collect(toList());
    }

    private List<String> getSalvoLocations (GamePlayer gamePlayer) {
        Set<Salvo> salvos = gamePlayer.getSalvos();
        return salvos.stream()
                .map(salvo -> salvo.getLocation())
                .flatMap(location -> location.stream())
                .collect(toList());
    }

    private List<String> getHits (Salvo salvo) {
        GamePlayer user = salvo.getGamePlayer();
        GamePlayer enemy = enemyGamePlayer(user);
        if (enemy !=null) {
            List<String> shipsLocation = getShipLocations(enemy);
            List<String> salvosLocation = salvo.getLocation();

            return salvosLocation.stream()
                    .filter(location -> shipsLocation.contains(location))
                    .collect(toList());
        } else {
            return null;
        }
    }

    private Boolean shipIsSunk (List<String> playerSalvos, Ship ship) {
        boolean shipIsSunk = ship.getLocation()
                .stream()
                .allMatch(location -> playerSalvos.contains(location));
        if (shipIsSunk) {
            ship.setSunk(true);
            shipRepository.save(ship);
        }
        return shipIsSunk;
    }

    private void sinkShip(GamePlayer gamePlayer) {
        GamePlayer enemy = enemyGamePlayer(gamePlayer);
        if (enemy != null) {

            Set<Ship> enemyShips = enemy.getShips();
            List<String> playerSalvos = getSalvoLocations(gamePlayer);
            enemyShips.stream()
                    .filter(ship -> !ship.getSunk())
                    .forEach(ship -> {
                        shipIsSunk(playerSalvos, ship);
                    });
        }
    }

    private void allSunk (GamePlayer gamePlayer, Integer userTurn, Integer enemyTurn) {
        if (enemyGamePlayer(gamePlayer) != null && userTurn == enemyTurn) {
                setFinalScore(gamePlayer);
        }
    }

    private void setFinalScore(GamePlayer gamePlayer) {
        Boolean user = allShipsSunk(arrayOfSunk(gamePlayer.getShips()));
        Boolean enemy = allShipsSunk(arrayOfSunk(enemyGamePlayer(gamePlayer).getShips()));
        if (!user && enemy){
            scoreRepository.save(setScore(gamePlayer,0.0));
        } else if (user && !enemy){
            scoreRepository.save(setScore(gamePlayer,1.0));
        } else if (user && enemy) {
            scoreRepository.save(setScore(gamePlayer,0.5));
        }
    }

    private Score setScore(GamePlayer gamePlayer, Double score) {
        return new Score(score, gamePlayer.getPlayer(), gamePlayer.getGame());
    }

    private List<String> arrayOfSunk(Set<Ship> ships) {
        List<String> arrayOfSunk = new ArrayList<>();
        for (Ship ship : ships) {
            if (ship.getSunk()) {
                arrayOfSunk.add(ship.getType());
            }
        }
        return arrayOfSunk;
    }

    private Boolean allShipsSunk (List<String> arrayOfSunks) {
        Boolean allSunk = false;
        if (arrayOfSunks.size() == 4) {
            allSunk = true;
        }
        return allSunk;
    }

    private Map<String,Object> shipStatus (Ship ship) {
        Map<String,Object> shipMap = new LinkedHashMap<>();

        shipMap.put("type", ship.getType());
        shipMap.put("sunk", ship.getSunk());
        if (ship.getSunk() == true) {
            shipMap.put("ship-location", ship.getLocation());
        }
        return shipMap;
    }

    private Map<String, Object> getGame (Game game) {
        Map<String, Object> gameMap = new LinkedHashMap<>();
        gameMap.put("game_id", game.getId());
        gameMap.put("game_creation", game.getDate());
        gameMap.put("gameplayers", game.getGamePlayers().stream()
                .map(gp -> getGamePlayer(gp))
                .collect(toList()));
        return gameMap;
    }

    private Map<String,Object> getGamePlayer (GamePlayer gamePlayer) {
        Map<String, Object> gamePlayersMap = new LinkedHashMap<>();
        gamePlayersMap.put("gameplayer_id", gamePlayer.getId());
        gamePlayersMap.put("player", getPlayer(gamePlayer));
        if (gamePlayer.getScores() != null) {
            gamePlayersMap.put("score", gamePlayer.getScores().getScore());
        } else {
            gamePlayersMap.put("score", null);
        }
        return gamePlayersMap;
    }

    private Map<String,Object> getPlayer(GamePlayer gamePlayer) {
        Map<String, Object> playersMap = new HashMap<>();
        Player player = gamePlayer.getPlayer();
        playersMap.put("player_id", player.getId());
        playersMap.put("player_username", player.getUserName());
        return playersMap;
    }

    private Map<String, Object> getShipInfo (Ship ship) {
        Map<String, Object> shipMap = new LinkedHashMap<>();
        shipMap.put("type", ship.getType());
        shipMap.put("location", ship.getLocation());
        return shipMap;
    }

    private List<Object> getSalvoInfo (GamePlayer gamePlayer){
        List<Object> salvoList = new ArrayList<>();
        Set<Salvo> salvos = gamePlayer.getSalvos();
        for (Salvo salvo : salvos) {
            Map<String, Object> salvoMap = new LinkedHashMap<>();
            salvoMap.put("gameplayer_id",salvo.getGamePlayer().getId());
            salvoMap.put("location", salvo.getLocation());
            salvoMap.put("turn", salvo.getTurn());
            salvoList.add(salvoMap);
        }
        return salvoList;
    }

    private Map<String, Object> makeMap(String key, Object value) {
        Map<String, Object> map = new HashMap<>();
        map.put(key, value);
        return map;
    }
}
