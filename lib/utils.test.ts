import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseNDJSONLine } from "./utils.ts";

Deno.test("parseNDJSONLine - parses valid JSON lines correctly", () => {
    const line = '{"type": "progress", "message": "hello"}';
    const result = parseNDJSONLine(line);
    assertEquals(result, { type: 'progress', message: 'hello' });
});

Deno.test("parseNDJSONLine - handles lines with extra whitespace", () => {
    const line = '   {"type": "done"}   ';
    const result = parseNDJSONLine(line);
    assertEquals(result, { type: 'done' });
});

Deno.test("parseNDJSONLine - returns null for empty lines", () => {
    assertEquals(parseNDJSONLine(''), null);
    assertEquals(parseNDJSONLine('   '), null);
});

Deno.test("parseNDJSONLine - extracts JSON island from malformed lines", () => {
    const line = 'Random text before {"type": "candidates", "data": []} and after';
    const result = parseNDJSONLine(line);
    assertEquals(result, { type: 'candidates', data: [] });
});

Deno.test("parseNDJSONLine - returns null for completely invalid lines", () => {
    const line = 'no json here';
    const result = parseNDJSONLine(line);
    assertEquals(result, null);
});
