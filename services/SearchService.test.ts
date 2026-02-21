import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { SearchService } from "./SearchService.ts";
import { resetMocks } from "./__mocks__/shared_state.ts";

Deno.test("SearchService - History Management", async (t) => {

    await t.step("saveToHistory - adds a new item", async () => {
        resetMocks();
        const mockBird: any = {
            id: 1,
            name: "American Robin",
            preferred_common_name: "Robin",
            default_photo: { square_url: "http://photo.com/1.jpg" }
        };

        await SearchService.saveToHistory(mockBird);
        const history = await SearchService.getRecentSearches();

        assertEquals(history.length, 1);
        assertEquals(history[0].id, 1);
        assertEquals(history[0].preferred_common_name, "Robin");
    });

    await t.step("saveToHistory - deduplicates and moves to front", async () => {
        resetMocks();
        const bird1: any = { id: 1, name: "Bird 1" };
        const bird2: any = { id: 2, name: "Bird 2" };

        await SearchService.saveToHistory(bird1);
        await SearchService.saveToHistory(bird2);

        // Re-save bird 1
        await SearchService.saveToHistory(bird1);

        const history = await SearchService.getRecentSearches();
        assertEquals(history.length, 2);
        assertEquals(history[0].id, 1); // Bird 1 should be at the front
        assertEquals(history[1].id, 2);
    });

    await t.step("saveToHistory - respects maximum history size (10)", async () => {
        resetMocks();
        for (let i = 1; i <= 15; i++) {
            await SearchService.saveToHistory({ id: i, name: `Bird ${i}` } as any);
        }

        const history = await SearchService.getRecentSearches();
        assertEquals(history.length, 10);
        assertEquals(history[0].id, 15); // Latest should be first
    });

    await t.step("clearHistory - removes all items", async () => {
        resetMocks();
        await SearchService.saveToHistory({ id: 1, name: "Test" } as any);
        await SearchService.clearHistory();

        const history = await SearchService.getRecentSearches();
        assertEquals(history.length, 0);
    });
});
