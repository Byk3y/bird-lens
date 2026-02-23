import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

/**
 * Basic test suite for the delete-user Edge Function.
 * Note: Real-world tests would require a service role key and a test user.
 * This file serves as a template for verification logic.
 */

Deno.test("delete-user: unauthorized request without header", async () => {
    const res = await fetch("http://localhost:54321/functions/v1/delete-user", {
        method: "POST"
    });
    const data = await res.json();

    assertEquals(res.status, 400);
    assertEquals(data.error, "Missing Authorization header");
});

Deno.test("delete-user: OPTIONS request should return CORS headers", async () => {
    const res = await fetch("http://localhost:54321/functions/v1/delete-user", {
        method: "OPTIONS"
    });

    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Access-Control-Allow-Origin"), "https://zupcpodceganwtzztclr.supabase.co");
});
