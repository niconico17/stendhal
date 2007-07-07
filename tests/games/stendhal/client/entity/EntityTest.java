package games.stendhal.client.entity;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import java.awt.geom.Rectangle2D;

import marauroa.common.game.RPObject;
import marauroa.common.game.RPObject.ID;

import org.junit.Test;

public class EntityTest {

	public class MockEntity2DView extends Entity2DView {

		public MockEntity2DView(Entity entity) {
			super(entity);
			
		}

		@Override
		public Rectangle2D getDrawnArea() {
			
			return null;
		}

	}

	@Test
	public final void testEntity() {
		Entity en = new MockEntity();
		
		assertEquals(0.0,en.getX());
		assertEquals(0.0,en.getY());
	
		
	}
	
	@Test
	public final void testInitialize() {
     MockEntity en;
	 RPObject rpo;
	 rpo = new RPObject();
	 rpo.put("type", "_hugo");

	 en = new MockEntity();
assertEquals(0,en.count);
	 en.initialize(rpo);
	 assertEquals("onPosition should only be called once ",1,en.count);
	}
	
	
	@Test
	public final void testEntityRPObject() {
		RPObject rpo = new RPObject();
		rpo.put("type", "hugo");
		rpo.put("name", "bob");
		
		Entity en = new MockEntity();
		en.initialize(rpo);
		assertEquals("hugo", en.getType());
		assertEquals("bob", en.getName());

	}

	@Test
	public final void testGet_IDToken() {
		Entity en = new MockEntity();
		assertNotNull(en.ID_Token);

	}

	@Test
	public final void testGetID() {
		
		RPObject rpo = new RPObject();
		rpo.put("type", "hugo");
		rpo.setID(new ID(1, "woohoo"));
		Entity en = new MockEntity();
		en.initialize(rpo);
		assertNotNull("id must not be null",en.getID());
		assertEquals(1, en.getID().getObjectID());
		assertEquals("woohoo", en.getID().getZoneID());
	}

	@Test
	public final void testGetNamegetType() {
		Entity en;
		RPObject rpo;
		rpo = new RPObject();
		rpo.put("type", "_hugo");
		en = new MockEntity();
		en.initialize(rpo);
		assertEquals("_hugo", en.getType());
		
		rpo = new RPObject();
		rpo.put("type", "hugo");
		rpo.put("name", "ragnarok");
		en = new MockEntity();
		en.initialize(rpo);
		assertEquals("hugo", en.getType());
		assertEquals("ragnarok", en.getName());
	}

	@Test
	public final void testGetXGetY() {
		Entity en;
		en = new MockEntity();

		assertEquals(0.0, en.getX());
		assertEquals(0.0, en.getY());
	}



	

	@Test
	public final void testDistance() {
		Entity en = new MockEntity();
		User.setNull(); 
		User to=null;
		assertEquals(Double.POSITIVE_INFINITY, en.distanceToUser());
		to = new User();
		
 		en.x=3;
 		en.y=4;
		assertEquals(3.0, en.getX());
		assertEquals(4.0, en.getY());
		assertEquals(25.0, en.distanceToUser());
		assertEquals(0.0, to.distanceToUser());
		
	}

	
	@Test
	public final void testGetSprite() {
		Entity en;
		RPObject rpo;
		rpo = new RPObject();
		rpo.put("type", "_hugo");

		en = new MockEntity();
		en.initialize(rpo);
		assertNotNull(en.getView().getSprite());

	}

	@Test
	public final void testSetAudibleRangegetAudibleArea() {
		Entity en;
		en = new MockEntity();
		assertNull(en.getAudibleArea());
		en.setAudibleRange(5d);
		Rectangle2D rectangle = new Rectangle2D.Double(-5d, -5d, 10d, 10d);
		assertEquals(rectangle, en.getAudibleArea());
		en.setAudibleRange(1d);
		rectangle = new Rectangle2D.Double(-1d, -1d, 2d, 2d);
		assertEquals(rectangle, en.getAudibleArea());

	}

	@Test

	public final void testGetSlot() {
		Entity en = new MockEntity();
		assertEquals(null,en.getSlot(""));
		
	}

	
	@Test
	public final void testOfferedActions() {
		Entity en = new MockEntity();
		String[] str = new String[1];
		str[0]="Look";
		assertEquals(str, en.getView().getActions());
	}

	@Test
	public final void testBuildOfferedActions() {
		Entity en = new MockEntity();
		String [] expected = {"Look"};
		assertEquals(expected, en.getView().getActions());
	}

	
	private class MockEntity extends Entity {
 int count=0;
	
		public MockEntity() {
			rpObject = new RPObject();
			rpObject.put("type", "entity");
		}

		@Override
		public Rectangle2D getArea() {
			return null;
		}

		@Override
		protected Entity2DView createView() {
			return new MockEntity2DView(this);
		}

		@Override
		protected void onPosition(double x, double y) {
			count++;
			super.onPosition(x, y);
			
		}
		
	}
}
