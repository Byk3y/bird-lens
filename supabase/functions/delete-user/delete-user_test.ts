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
    // In local testing, SUPABASE_URL might not be set in Deno.env if not using supabase start
    // or it might point to localhost. We check if it matches the env or falls back to wildcard if provided.
    const expectedOrigin = Deno.env.get("SUPABASE_URL") || "*";
    assertEquals(res.headers.get("Access-Control-Allow-Origin"), expectedOrigin);
});
