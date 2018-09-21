package salvo.salvo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configurers.GlobalAuthenticationConfigurerAdapter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.WebAttributes;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.util.Arrays;
import java.util.List;

@SpringBootApplication
public class SalvoApplication {

	public static void main(String[] args) {
		SpringApplication.run(SalvoApplication.class, args);
	}
	@Bean
	public CommandLineRunner initData(PlayerRepository playerRepository,
									  GameRepository gameRepository,
									  GamePlayerRepository gamePlayerRepository,
									  ShipRepository shipRepository,
									  SalvoRepository salvoRepository,
									  ScoreRepository scoreRepository) {
		return (args) -> {

			Player player1 = new Player ("j.bauer@ctu.gov","123");
			Player player2 = new Player ("Brian","777");
			Player player3 = new Player ("Paul","777");
			Player player4 = new Player ("Spike","777");

			playerRepository.save(player1);
			playerRepository.save(player2);
			playerRepository.save(player3);
			playerRepository.save(player4);


			Game game1 = new Game();
			Game game2 = new Game();
			Game game3 = new Game();
			Game game4 = new Game();

			gameRepository.save(game1);
			gameRepository.save(game2);
			gameRepository.save(game3);
			gameRepository.save(game4);

			GamePlayer gamePlayer1 = new GamePlayer(player1, game1);
			GamePlayer gamePlayer2 = new GamePlayer(player2, game1);
			GamePlayer gamePlayer3 = new GamePlayer(player3, game2);
			GamePlayer gamePlayer4 = new GamePlayer(player4, game2);
			GamePlayer gamePlayer5 = new GamePlayer(player1, game3);
			GamePlayer gamePlayer6 = new GamePlayer(player2, game4);

			gamePlayerRepository.save(gamePlayer1);
			gamePlayerRepository.save(gamePlayer2);
			gamePlayerRepository.save(gamePlayer3);
			gamePlayerRepository.save(gamePlayer4);
			gamePlayerRepository.save(gamePlayer5);
			gamePlayerRepository.save(gamePlayer6);

			List<String> shipLocation1 = Arrays.asList("A1","A2","A3","A4","A5");
			List<String> shipLocation2 = Arrays.asList("C5","D5","E5","F5");
			List<String> shipLocation3 = Arrays.asList("H1","H2","H3","H4");
			List<String> shipLocation4 = Arrays.asList("G7","H7","I7");

			List<String> salvoLocation1 = shipLocation1;
			List<String> salvoLocation2 = shipLocation2;
			List<String> salvoLocation3 = shipLocation3;
			List<String> salvoLocation4 = shipLocation4;



			Ship ship1 = new Ship("destroyer", shipLocation1,gamePlayer1);
			Ship ship2 = new Ship("cruiser", shipLocation2,gamePlayer1);
			Ship ship3 = new Ship("submarine", shipLocation3,gamePlayer1);
			Ship ship4 = new Ship("boat", shipLocation4,gamePlayer1);

			Ship ship5 = new Ship("destroyer", shipLocation1,gamePlayer2);
			Ship ship6 = new Ship("cruiser", shipLocation2,gamePlayer2);
			Ship ship7 = new Ship("submarine", shipLocation3,gamePlayer2);
			Ship ship8 = new Ship("boat", shipLocation4,gamePlayer2);

			shipRepository.save(ship1);
			shipRepository.save(ship2);
			shipRepository.save(ship3);
			shipRepository.save(ship4);
			shipRepository.save(ship5);
			shipRepository.save(ship6);
			shipRepository.save(ship7);
			shipRepository.save(ship8);

			Salvo salvo1 = new Salvo(salvoLocation1,1,gamePlayer1);
			Salvo salvo2 = new Salvo(salvoLocation2,2,gamePlayer1);
			Salvo salvo3 = new Salvo(salvoLocation3,3,gamePlayer1);
			Salvo salvo4 = new Salvo(salvoLocation1,1,gamePlayer2);
			Salvo salvo5 = new Salvo(salvoLocation2,2,gamePlayer2);
			Salvo salvo6 = new Salvo(salvoLocation3,3,gamePlayer2);

			salvoRepository.save(salvo1);
			salvoRepository.save(salvo2);
			salvoRepository.save(salvo3);
			salvoRepository.save(salvo4);
			salvoRepository.save(salvo5);
			salvoRepository.save(salvo6);

//			Score score1 = new Score(1, player1, game1);
//			Score score2 = new Score(0, player2, game1);
//			Score score3 = new Score(0.5, player1, game2);
//			Score score4 = new Score(0.5, player2, game2);
//			Score score5 = new Score(1, player3,game3);
//			Score score6 = new Score(1, player3,game4);

//			scoreRepository.save(score1);
//			scoreRepository.save(score2);
//			scoreRepository.save(score3);
//			scoreRepository.save(score4);
//			scoreRepository.save(score5);
//			scoreRepository.save(score6);

		};
	}
}

@Configuration
class WebSecurityConfiguration extends GlobalAuthenticationConfigurerAdapter {

	@Autowired
	PlayerRepository playerRepository;

	@Override
	public void init(AuthenticationManagerBuilder auth) throws Exception {
		auth.userDetailsService(inputName-> {
			Player player = playerRepository.findByUserName(inputName).get(0);
			if (player != null) {
				return new User(player.getUserName(), player.getPassword(),
						AuthorityUtils.createAuthorityList("USER"));
			} else {
				throw new UsernameNotFoundException("Unknown user: " + inputName);
			}
		});
	}
}

@EnableWebSecurity
@Configuration
class WebSecurityConfig extends WebSecurityConfigurerAdapter {

	@Override
	protected void configure(HttpSecurity http) throws Exception {
		http.authorizeRequests()
				.antMatchers("/**").permitAll()
				.and()
				.formLogin();

		http.formLogin()
				.usernameParameter("userName")
				.passwordParameter("password")
				.loginPage("/api/login");

		http.logout().logoutUrl("/api/logout");

		// turn off checking for CSRF tokens
		http.csrf().disable();

		// if user is not authenticated, just send an authentication failure response
		http.exceptionHandling().authenticationEntryPoint((req, res, exc) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED));

		// if login is successful, just clear the flags asking for authentication
		http.formLogin().successHandler((req, res, auth) -> clearAuthenticationAttributes(req));

		// if login fails, just send an authentication failure response
		http.formLogin().failureHandler((req, res, exc) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED));

		// if logout is successful, just send a success response
		http.logout().logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler());
	}

	private void clearAuthenticationAttributes(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.removeAttribute(WebAttributes.AUTHENTICATION_EXCEPTION);
		}
	}
}

