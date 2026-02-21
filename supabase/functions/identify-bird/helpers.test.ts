import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { addWavHeader, cleanAndParseJson, fixXenoCantoUrl, isWavHeaderPresent, mapBirdNetToCandidates, mapMediaToResponse, processXenoCantoRecordings, validateBirdMetadata } from "../_shared/utils.ts";

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

Deno.test("cleanAndParseJson - handles single quotes as feet", () => {
    // Unwrapped single quote at end of string
    const input = '{"height": "1\'"}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.height, "1 feet");
});

Deno.test("cleanAndParseJson - fixes trailing commas", () => {
    const input = '{"candidates": [{"name": "Robin"},],}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.candidates[0].name, "Robin");
});

Deno.test("cleanAndParseJson - handles measurement marks", () => {
    // Unescaped " followed by space/text (Invalid JSON)
    const input = '{"description": "It has a 5" wingspan and is 1\' tall."}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.description, "It has a 5 inches wingspan and is 1 feet tall.");
});

Deno.test("cleanAndParseJson - handles unescaped measurement marks in complex strings", () => {
    const input = '{"description": "It is 8" tall and 2\' wide"}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.description, "It is 8 inches tall and 2 feet wide");
});

Deno.test("cleanAndParseJson - handles unescaped newlines", () => {
    const input = '{"note": "This has a\\nnewline"}';
    const result = cleanAndParseJson(input, "test");
    assertEquals(result.note, "This has a\nnewline");
});

Deno.test("fixXenoCantoUrl - handles download links", () => {
    const rec = {
        osci: { large: "https://xeno-canto.org/sounds/uploaded/DIR/osci.png" },
        "file-name": "XC123.mp3"
    };
    const url = "https://xeno-canto.org/123/download";
    const result = fixXenoCantoUrl(url, rec);
    assertEquals(result, "https://xeno-canto.org/sounds/uploaded/DIR/XC123.mp3");
});

Deno.test("isWavHeaderPresent - detects valid WAV header", () => {
    const input = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69]);
    assertEquals(isWavHeaderPresent(input), true);
});

Deno.test("addWavHeader - adds correct header", () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const wav = addWavHeader(data, 44100, 1, 16);
    assertEquals(wav.length, 44 + 4);
});

Deno.test("mapBirdNetToCandidates - maps BirdNET keys", () => {
    const birdNetJson = {
        predictions: [{
            species: [{ species_name: "Genus_species_Common Name", probability: 0.9 }]
        }]
    };
    const res = mapBirdNetToCandidates(birdNetJson);
    assertEquals(res[0].name, "Common Name");
    assertEquals(res[0].scientific_name, "Genus_species");
});

Deno.test("validateBirdMetadata - identifies incomplete data", () => {
    const validData = {
        name: "Robin",
        scientific_name: "Turdus migratorius",
        habitat: "Gardens",
        description: "Red breast.",
        diet: "Worms",
        conservation_status: "LC",
        behavior: "Hops",
        taxonomy: { family: "Turdidae", genus: "Turdus" }
    };
    assertEquals(validateBirdMetadata(validData), true);

    const incomplete = { ...validData, habitat: "Unknown" };
    assertEquals(validateBirdMetadata(incomplete), false);
});

Deno.test("processXenoCantoRecordings - maps correctly", () => {
    const recs = [{ id: "1", type: "Song", gen: "A", sp: "b", en: "Name", file: "//xc.org/1.mp3" }];
    const res = processXenoCantoRecordings(recs as any);
    assertEquals(res.length, 1);
    assertEquals(res[0].url, "https://xc.org/1.mp3");
});

Deno.test("mapMediaToResponse - formats response", () => {
    const params = {
        scientific_name: "Test",
        media: { inat_photos: [{ url: "u1" }] },
        taxonKey: 123
    };
    const result = mapMediaToResponse(params);
    assertEquals(result.image.url, "u1");
});
