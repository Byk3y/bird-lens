import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { cleanAndParseJson, fixXenoCantoUrl } from "../_shared/utils.ts";

Deno.test("cleanAndParseJson - basic valid json", () => {
    const input = '{"candidates": [{"name": "Robin"}]}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.candidates[0].name, "Robin");
});

Deno.test("cleanAndParseJson - removes markdown blocks", () => {
    const input = "```json\n" + '{"candidates": [{"name": "Robin"}]}' + "\n```";
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.candidates[0].name, "Robin");
});

Deno.test("cleanAndParseJson - handles unescaped internal quotes in measurements", () => {
    const input = '{"size": "8\\" wing", "height": "10-12\\""}';
    // Note: the current implementation replaces (\d+)" with $1 inches
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.size, "8 inches wing");
    assertEquals(result.height, "10-12 inches");
});

Deno.test("cleanAndParseJson - handles single quotes as feet", () => {
    const input = '{"height": "1\'"}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.height, "1 feet");
});

Deno.test("cleanAndParseJson - fixes trailing commas", () => {
    const input = '{"a": 1, "b": 2, }';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.a, 1);
    assertEquals(result.b, 2);
});

Deno.test("cleanAndParseJson - extracts json from surrounding text", () => {
    const input = 'Random text before {"name": "Robin"} and after';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.name, "Robin");
});

Deno.test("cleanAndParseJson - throws on invalid json", () => {
    const input = '{"invalid": ';
    assertThrows(() => cleanAndParseJson(input, "test"));
});

Deno.test("fixXenoCantoUrl - appends https to protocol-less urls", () => {
    const input = "//xeno-canto.org/123/download";
    const result = fixXenoCantoUrl(input);
    assertEquals(result, "https://xeno-canto.org/123/download");
});

Deno.test("fixXenoCantoUrl - constructs direct mp3 url with metadata", () => {
    const url = "https://xeno-canto.org/123/download";
    const rec = {
        osci: { large: "https://xeno-canto.org/sounds/uploaded/DIRNAME/XC123.png" },
        "file-name": "custom.mp3"
    };
    // @ts-ignore
    const result = fixXenoCantoUrl(url, rec);
    assertEquals(result, "https://xeno-canto.org/sounds/uploaded/DIRNAME/custom.mp3");
});

Deno.test("fixXenoCantoUrl - fallback to original if osci missing", () => {
    const url = "https://xeno-canto.org/123/download";
    const result = fixXenoCantoUrl(url);
    assertEquals(result, url);
});
