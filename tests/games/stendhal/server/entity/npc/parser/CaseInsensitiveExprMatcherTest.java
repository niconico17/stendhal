package games.stendhal.server.entity.npc.parser;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Test the CaseInsensitiveExprMatcher class.
 * 
 * @author Martin Fuchs
 */
public class CaseInsensitiveExprMatcherTest {

	@Test
	public final void testCaseInsensitiveMatching() {
		ExpressionMatcher matcher = new CaseInsensitiveExprMatcher();

		Expression e1 = new Expression("aBc", "VER");
		Expression e2 = new Expression("abc", "VER");
		Expression e3 = new Expression("ab", "VER");
		Expression e4 = new Expression("abc", "SUB");
		Expression e5 = new Expression("X", "SUB");

		assertTrue(matcher.match(e1, e2));
		assertFalse(matcher.match(e1, e3));
		assertTrue(matcher.match(e1, e4));
		assertFalse(matcher.match(e1, e5));
		assertFalse(matcher.match(e4, e5));
	}

}
