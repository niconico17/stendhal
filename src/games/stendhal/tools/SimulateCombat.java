/***************************************************************************
 *                   (C) Copyright 2003-2022 - Arianne                     *
 ***************************************************************************
 ***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
package games.stendhal.tools;

import java.lang.StringBuilder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;

import games.stendhal.server.core.engine.RPClassGenerator;
import games.stendhal.server.core.engine.SingletonRepository;
import games.stendhal.server.core.engine.transformer.PlayerTransformer;
import games.stendhal.server.core.rule.EntityManager;
import games.stendhal.server.entity.creature.Creature;
import games.stendhal.server.entity.item.Item;
import games.stendhal.server.entity.player.Player;
import marauroa.common.Pair;
import marauroa.common.game.RPObject;


/**
 * Class for simulating player vs. creature combat.
 *
 * Note: some of the following code is taken from games.stendhal.tools.BalanceRPGame
 *
 * Usage:
 *     games.stendhal.tools.SimulateCombat --lvl <lvl> --hp <hp> --atk <atk> --def <def>[ --rounds <rounds>]
 *     games.stendhal.tools.SimulateCombat --help
 *
 * @param --lvl
 *     Level at which player & enemy should be set.
 * @param --hp
 *     HP value of enemy.
 * @param --atk
 *     Attack level of enemy.
 * @param --def
 *     Defense level of enemy.
 * @param --rounds
 *     Number of rounds to simulate (default: 500).
 * @param --threshold
 *     Difference threshold used to determine if combat was balanced.
 * @param --barehanded
 *     Entities will not be equipped with weapons & armor.
 * @param --equipsame
 *     Enemy will be equipped with same weapons & armor as player.
 * @param --noboost
 *     Player will not get boost from equipment.
 * @param --fair
 *     Gives player weapon with atk 5 & no other equipment (overrides --barehanded).
 * @param --help
 *     Show usage information & exit.
 */
public class SimulateCombat {

	private static final int default_rounds = 1000;
	private static int rounds = default_rounds;
	private static final int default_balance_threshold = 5;
	private static int balance_threshold = default_balance_threshold;

	private static Integer lvl;
	private static Integer hp;
	private static Integer atk;
	private static Integer def;

	private static Player player;
	private static Creature enemy;

	/**
	 * If set to <code>true</code>, entities will not be equipped with weapons
	 * & armor.
	 */
	private static boolean barehanded = false;
	private static boolean equipsame = false;
	private static boolean noboost = false;
	private static boolean fair = false;

	/**
	 * If a round exceeds this number of turns round will be terminated.
	 *
	 * Used as protection against infinite loop.
	 */
	private static final int TURN_LIMIT = 1000;
	private static int incomplete_rounds = 0;


	public static void main(final String[] argv) throws Exception {
		parseArgs(argv);

		if (rounds < 1) {
			showUsageErrorAndExit("rounds argument must be a postive number", 1);
		} else if (balance_threshold < 1 || balance_threshold > 100) {
			showUsageErrorAndExit("threshold argument must be a number between 1 & 100", 1);
		} else if (lvl == null) {
			showUsageErrorAndExit("lvl argument must be set", 1);
		} else if (hp == null) {
			showUsageErrorAndExit("hp argument must be set", 1);
		} else if (atk == null) {
			showUsageErrorAndExit("atk argument must be set", 1);
		} else if (def == null) {
			showUsageErrorAndExit("def argument must be set", 1);
		}

		initEntities();
		runSimulation();
	}

	private static void showDescription() {
		final StringBuilder sb = new StringBuilder("\nDescription:");

		sb.append("\n  A tool for simulating combat between a player & enemy.");
		sb.append("\n\n  It can be used to check if player vs. creature situation is balanced.");

		System.out.println(sb.toString());
	}

	private static void showUsage() {
		final String exe = SimulateCombat.class.getPackage().getName()
			+ "." + SimulateCombat.class.getSimpleName();

		System.out.println("\nUsage:"
			+ "\n\t" + exe
				+ " --lvl <lvl> --hp <hp> --atk <atk> --def <def>"
				+ "[ --rounds <rounds>][ --threshold <threshold>][ flags...]"
			+ "\n\t" + exe + " --help"
			+ "\n\nRegular Arguments:"
			+ "\n\t--lvl:        Level at which player & enemy should be set."
			+ "\n\t--hp:         HP value of enemy."
			+ "\n\t--atk:        Attack level of enemy."
			+ "\n\t--def:        Defense level of enemy."
			+ "\n\t--rounds:     Number of rounds to simulate (default: " + default_rounds + ")."
			+ "\n\t--threshold:  Difference threshold used to determine if combat was balanced (default: "
				+ default_balance_threshold + ")."
			+ "\n\t--help|-h:    Show usage information & exit."
			+ "\n\nFlag Arguments:"
			+ "\n\t--barehanded: Entities will not be equipped with weapons & armor."
			+ "\n\t--equipsame:  Enemy will be equipped with same weapons & armor as player."
			+ "\n\t--noboost:    Player will not get boost from equipment."
			+ "\n\t--fair:       Gives player weapon with atk 5 & no other equipment (overrides --barehanded).");
	}

	private static void showUsageErrorAndExit(final String msg, final int err) {
		System.out.println("\nERROR: " + msg);
		showUsage();
		System.exit(err);
	}

	private static void parseArgs(final String[] argv) {
		final List<String> unknownArgs = new ArrayList<>();

		for (int idx = 0; idx < argv.length; idx++) {
			final String st = argv[idx].toLowerCase();

			if (st.equals("--help") || st.equals("-h") || st.equals("help")) {
				showDescription();
				showUsage();
				System.exit(0);
			} else if (st.equals("--lvl") || st.equals("--level")) {
				if (argv.length < idx + 2) {
					showUsageErrorAndExit("lvl argument requires value", 1);
				}

				try {
					lvl = Integer.parseInt(argv[idx + 1]);
				} catch (final NumberFormatException e) {
					showUsageErrorAndExit("lvl argument must be an integer number", 1);
				}

				idx++;
			} else if (st.equals("--hp")) {
				if (argv.length < idx + 2) {
					showUsageErrorAndExit("hp argument requires value", 1);
				}

				try {
					hp = Integer.parseInt(argv[idx + 1]);
				} catch (final NumberFormatException e) {
					showUsageErrorAndExit("hp argument must be an integer number", 1);
				}

				idx++;
			} else if (st.equals("--atk") || st.equals("--attack")) {
				if (argv.length < idx + 2) {
					showUsageErrorAndExit("atk argument requires value", 1);
				}

				try {
					atk = Integer.parseInt(argv[idx + 1]);
				} catch (final NumberFormatException e) {
					showUsageErrorAndExit("atk argument must be an integer number", 1);
				}

				idx++;
			} else if (st.equals("--def") || st.equals("--defense")) {
				if (argv.length < idx + 2) {
					showUsageErrorAndExit("def argument requires value", 1);
				}

				try {
					def = Integer.parseInt(argv[idx + 1]);
				} catch (final NumberFormatException e) {
					showUsageErrorAndExit("def argument must be an integer number", 1);
				}

				idx++;
			} else if (st.equals("--rounds")) {
				if (argv.length < idx + 2) {
					showUsageErrorAndExit("rounds argument requires value", 1);
				}

				try {
					rounds = Integer.parseInt(argv[idx + 1]);
				} catch (final NumberFormatException e) {
					showUsageErrorAndExit("rounds argument must be an integer number", 1);
				}

				idx++;
			} else if (st.equals("--threshold")) {
				if (argv.length < idx + 2) {
					showUsageErrorAndExit("threshold argument requires value", 1);
				}

				try {
					balance_threshold = Integer.parseInt(argv[idx + 1]);
				} catch (final NumberFormatException e) {
					showUsageErrorAndExit("threshold argument must be an integer number", 1);
				}

				idx++;
			} else if (st.equals("--barehanded")) {
				barehanded = true;
			} else if (st.equals("--equipsame")) {
				equipsame = true;
			} else if (st.equals("--noboost")) {
				noboost = true;
			} else if (st.equals("--fair")) {
				fair = true;
			} else {
				unknownArgs.add(st);
			}
		}

		if (unknownArgs.size() > 0) {
			showUsageErrorAndExit("Unknown argument: " + unknownArgs.get(0), 1);
		}
	}

	private static void initEntities() {
		new RPClassGenerator().createRPClasses();
		final EntityManager em = SingletonRepository.getEntityManager();

		final int HIGHEST_LEVEL = 597;

		final int[] atkLevels = new int[HIGHEST_LEVEL + 1];
		final int[] defLevels = new int[HIGHEST_LEVEL + 1];

		for (int l = 0; l < atkLevels.length; l++) {
			// help newbies a bit, so don't start at real stats, but a bit lower
			atkLevels[l] = (int) Math.round(Math.log(l + 4) * 9  - 10);
			defLevels[l] = (int) Math.round(Math.log(l + 4) * 20
					+ l - 26);
		}

		final Item weapon = em.getItem("club");
		final Item weapon_5 = em.getItem("soul dagger");
		final Item shield = em.getItem("wooden shield");
		final Item armor = em.getItem("dress");
		final Item helmet = em.getItem("leather helmet");
		final Item legs = em.getItem("leather legs");
		final Item boots = em.getItem("leather boots");

		player = (Player) new PlayerTransformer().transform(new RPObject());

		player.setLevel(lvl);
		player.setBaseHP(100 + 10 * lvl);
		player.setAtk(atkLevels[lvl]);
		player.setDef(defLevels[lvl]);

		if (fair) {
			player.equip("rhand", weapon_5);
		} else if (!barehanded) {
			player.equip("lhand", shield);
			player.equip("rhand", weapon);
			player.equip("armor", armor);
			player.equip("head", helmet);
			player.equip("legs", legs);
			player.equip("feet", boots);

			if (!noboost) {
				// not sure what this does (copied from games.stendhal.tools.BalanceRPGame)
				player.getWeapon().put("atk", 7 + lvl * 2 / 6);
				if (lvl == 0) {
					player.getShield().put("def", 0);
				} else {
					player.getShield().put("def", 12 + lvl / 8);
				}
				player.getArmor().put("def", 1 + lvl / 4);
				player.getHelmet().put("def", 1 + lvl / 7);
				player.getLegs().put("def", 1 + lvl / 7);
				player.getBoots().put("def", 1 + lvl / 10);
			}
		}

		enemy = new Creature("dummy", "dummy", "dummy", hp, atk, atk, def, lvl,
			1, 1, 1, 1.0, new ArrayList<>(), new HashMap<>(), new LinkedHashMap<>(), 1, "dummy");

		if (!barehanded && equipsame) {
			// doesn't appear to actually do anything
			enemy.equip("lhand", shield);
			enemy.equip("rhand", weapon);
			enemy.equip("armor", armor);
			enemy.equip("head", helmet);
			enemy.equip("legs", legs);
			enemy.equip("feet", boots);
		}
	}

	private static void runSimulation() {
		System.out.println("\nRunning simulation: ...");

		int wins = 0;
		int losses = 0;
		int ties = 0;

		for (int ridx = 0; ridx < rounds; ridx++) {
			final Pair<Integer, Integer> result = simulateRound();

			final int playerHP = result.first();
			final int enemyHP = result.second();

			String winner = "tie";
			if (playerHP > enemyHP) {
				winner = "player";
			} else if (playerHP < enemyHP) {
				winner = "enemy";
			}

			System.out.println("\nRound " + (ridx+1) + "/" + rounds + " winner: " + winner
				+ "\n  player HP: " + playerHP + "\n  enemy  HP: " + enemyHP);

			if (playerHP > enemyHP) {
				wins++;
			} else if (playerHP < enemyHP) {
				losses++;
			} else {
				ties++;
			}
		}

		final long win_ratio = Math.round((Double.valueOf(wins) / rounds) * 100);
		final long loss_ratio = Math.round((Double.valueOf(losses) / rounds) * 100);
		final long tie_ratio = Math.round((Double.valueOf(ties) / rounds) * 100);

		System.out.println("\nFINAL RESULT:");

		final int pAtk = player.getAtk();
		final int pDef = player.getDef();
		final double pItemAtk = player.getItemAtk();
		final double pItemDef = player.getItemDef();
		final double pAtkTotal = pAtk + pItemAtk;
		final double pDefTotal = pDef + pItemDef;

		final int eAtk = enemy.getAtk();
		final int eDef = enemy.getDef();
		final double eItemAtk = enemy.getItemAtk();
		final double eItemDef = enemy.getItemDef();
		final double eAtkTotal = eAtk + eItemAtk;
		final double eDefTotal = eDef + eItemDef;

		System.out.println("\n  Player stats:"
			+ "\n    Level: " + player.getLevel()
			+ "\n    HP:    " + player.getBaseHP()
			+ "\n    ATK:   " + pAtk
			+ "\n           (item: " + pItemAtk + ", total: " + pAtkTotal + ")"
			+ "\n    DEF:   " + pDef
			+ "\n           (item: " + pItemDef + ", total: " + pDefTotal + ")");

		System.out.println("\n  Enemy stats:"
			+ "\n    Level: " + enemy.getLevel()
			+ "\n    HP:    " + enemy.getBaseHP()
			+ "\n    ATK:   " + eAtk
			+ "\n           (item: " + eItemAtk + ", total: " + eAtkTotal + ")"
			+ "\n    DEF:   " + eDef
			+ "\n           (item: " + eItemDef + ", total: " + eDefTotal + ")");

		System.out.println("\n  Player wins:       " + wins + " (" + win_ratio + "%)"
			+ "\n  Enemy wins:        " + losses + " (" + loss_ratio + "%)"
			+ "\n  Ties:              " + ties + " (" + tie_ratio + "%)"
			+ "\n  Incomplete rounds: " + incomplete_rounds);

		long diff_ratio = 0;
		String beneficiary = "none";
		if (wins > losses) {
			diff_ratio = win_ratio - loss_ratio - tie_ratio;
			beneficiary = "player";
		} else if (wins < losses) {
			diff_ratio = loss_ratio - win_ratio - tie_ratio;
			beneficiary = "enemy";
		}

		System.out.println("\n  Resulting difference ratio: " + diff_ratio + "%");
		if (diff_ratio <= balance_threshold) {
			System.out.println("    Result is within balance threshold of "
				+ balance_threshold + "%");
		} else {
			System.out.println("    Result is not within balance threshold of "
				+ balance_threshold + "%");
		}
		System.out.println("    Beneficiary: " + beneficiary);
	}

	private static Pair<Integer, Integer> simulateRound() {
		// make sure entities have full HP for each round
		player.heal();
		enemy.heal();

		int turn = 0;
		while (player.getHP() > 0 && enemy.getHP() > 0) {
			turn++;

			final int damageDealt = player.damageDone(enemy, player.getItemAtk(), player.getDamageType());
			final int damageReceived = enemy.damageDone(player, enemy.getItemAtk(), player.getDamageType());

			player.setHP(player.getHP() - damageReceived);
			enemy.setHP(enemy.getHP() - damageDealt);

			if (turn == TURN_LIMIT && player.getHP() > 0 && enemy.getHP() > 0) {
				System.out.println("\nWARNING: Turn limit reached (" + TURN_LIMIT + "), terminating round ...");
				incomplete_rounds++;
				break;
			}
		}

		return new Pair<Integer, Integer>(player.getHP(), enemy.getHP());
	}
}
