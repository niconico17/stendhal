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
package data.script.quest;

import static org.junit.Assert.*;
import static utilities.SpeakerNPCTestHelper.getReply;

import org.junit.Before;
import org.junit.Test;

import games.stendhal.server.core.engine.SingletonRepository;
import games.stendhal.server.core.engine.StendhalRPWorld;
import games.stendhal.server.core.engine.StendhalRPZone;
import games.stendhal.server.entity.npc.ConversationStates;
import games.stendhal.server.entity.npc.SpeakerNPC;
import games.stendhal.server.entity.npc.fsm.Engine;
import games.stendhal.server.entity.player.Player;
import games.stendhal.server.maps.MockStendlRPWorld;
import utilities.LuaTestHelper;
import utilities.PlayerTestHelper;


public class UnicornHornsForZelanTest extends LuaTestHelper {

	private static StendhalRPWorld world;

	private Player player;
	private SpeakerNPC zelan;

	private final String slot = "unicorn_horns_for_zelan";


	@Before
	public void setup() {
		world = MockStendlRPWorld.get();
		world.addRPZone("deniran", new StendhalRPZone("-7_deniran_atlantis"));
		LuaTestHelper.load("data/script/region/atlantis/city/exterior/ZelanNPC.lua");
		LuaTestHelper.loadCachedQuests();
		PlayerTestHelper.removeAllPlayers();

		player = PlayerTestHelper.createPlayer("player");
		zelan = SingletonRepository.getNPCList().get("Zelan");
	}

	@Test
	public void initTests() {
		testEntities();
		testQuest();
	}

	private void testEntities() {
		assertNotNull(player);
		assertNotNull(zelan);
	}

	private void testQuest() {
		final Engine en = zelan.getEngine();

		assertFalse(player.hasQuest(slot));
		assertEquals(0, player.getNumberOfEquipped("unicorn horn"));
		assertEquals(0, player.getNumberOfEquipped("soup"));
		assertEquals(0, player.getNumberOfEquipped("money"));
		assertEquals(ConversationStates.IDLE, en.getCurrentState());

		int playerXP = player.getXP();
		double playerKarma = player.getKarma();

		en.step(player, "hi");
		assertEquals(ConversationStates.ATTENDING, en.getCurrentState());

		en.step(player, "quest");
		assertEquals(ConversationStates.QUEST_OFFERED, en.getCurrentState());
		assertEquals(
			"Hello! I'm in need of some unicorn horns to make some daggers."
			+ " It is really dangerous in the woods surrounding Atlantis. If you are a brave sort"
			+ " I could really use some help gathering unicorn horns. Will you help me?",
			getReply(zelan));
		en.step(player, "no");
		assertEquals(ConversationStates.ATTENDING, en.getCurrentState());
		assertEquals(
			"Thats ok, I will find someone else to help me.",
			getReply(zelan));
		assertTrue(player.getKarma() == playerKarma);
		assertEquals("rejected", player.getQuest(slot, 0));

		en.step(player, "quest");
		en.step(player, "yes");
		assertEquals(ConversationStates.ATTENDING, en.getCurrentState());
		assertEquals(
			"Great! Be careful out there lots of large monsters, and those centaurs are really nasty",
			getReply(zelan));
		assertEquals("start", player.getQuest(slot, 0));
		assertTrue(player.getKarma() == playerKarma);
		en.step(player, "bye");
		assertEquals(ConversationStates.IDLE, en.getCurrentState());

		PlayerTestHelper.equipWithStackableItem(player, "unicorn horn", 9);

		en.step(player, "hi");
		assertEquals(ConversationStates.ATTENDING, en.getCurrentState());
		en.step(player, "done");
		assertEquals("I asked you to bring me 10 unicorn horns.", getReply(zelan));
		en.step(player, "bye");

		PlayerTestHelper.equipWithStackableItem(player, "unicorn horn", 1);

		en.step(player, "hi");
		en.step(player, "done");
		assertEquals(
			"Thanks a bunch! As a reward I will give you 3 soups and 20000 money.",
			getReply(zelan));
		en.step(player, "bye");
		assertEquals(ConversationStates.IDLE, en.getCurrentState());

		assertEquals("done", player.getQuest(slot, 0));
		assertTrue(player.getKarma() == playerKarma + 5);
		assertEquals(playerXP + 50000, player.getXP());
		assertEquals(0, player.getNumberOfEquipped("unicorn horn"));
		assertEquals(3, player.getNumberOfEquipped("soup"));
		assertEquals(20000, player.getNumberOfEquipped("money"));
	}
}
