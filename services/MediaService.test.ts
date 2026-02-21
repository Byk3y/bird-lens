import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MediaService } from "./MediaService.ts";
import { invokeCount, resetMocks, setMockInvokeResponse, setMockInvokeResponses } from "./__mocks__/shared_state.ts";

/**
 * MOCKING STRATEGY:
 * Mocking Supabase and the global AbortController if needed.
 */

Deno.test("MediaService - Caching and Retries", async (t) => {

    await t.step("fetchBirdMedia - uses cache on subsequent calls", async () => {
        MediaService.clearCache();
        resetMocks();
        setMockInvokeResponse({ data: { image: { url: "test.jpg" } }, error: null });

        const res1 = await MediaService.fetchBirdMedia("Robin");
        const res2 = await MediaService.fetchBirdMedia("Robin");

        // Note: resetMocks sets invokeCount to 0, but incrementInvokeCount is inside the mock
        assertEquals(invokeCount, 1); // Only called once
        assertEquals(res1.image.url, "test.jpg");
        assertEquals(res2.image.url, "test.jpg");
    });

    await t.step("fetchBirdMedia - retries on error", async () => {
        MediaService.clearCache();
        resetMocks();
        setMockInvokeResponse({ data: null, error: new Error("Network fail") });

        // Should try 3 times (1 initial + 2 retries)
        await assertRejects(
            () => MediaService.fetchBirdMedia("ErrorBird"),
            Error,
            "Network fail"
        );

        assertEquals(invokeCount, 3);
    });

    await t.step("fetchBirdMedia - recovers on subsequent retry", async () => {
        MediaService.clearCache();
        resetMocks();

        setMockInvokeResponses([
            { data: null, error: new Error("Fail 1") },
            { data: { image: { url: "success.jpg" } }, error: null }
        ]);

        const res = await MediaService.fetchBirdMedia("RecoverBird");
        assertEquals(invokeCount, 2);
        assertEquals(res.image.url, "success.jpg");
    });
});
