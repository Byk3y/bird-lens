import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { IdentificationChunk } from "./IdentificationService.ts";
import { IdentificationService } from "./IdentificationService.ts";

// Mock the dependency since we are running in Deno but it usually lives in @/lib/utils
(globalThis as any).parseNDJSONLine = (line: string) => {
    try {
        return JSON.parse(line.trim());
    } catch {
        return null;
    }
};

Deno.test("IdentificationService.toBirdResult - maps correctly", () => {
    const rawBird = { name: "Testing Bird", scientific_name: "Testis birdus" };
    const media = {
        inat_photos: [{ url: 'test.jpg' }],
        sounds: [{ url: 'test.mp3' }]
    };

    const result = IdentificationService.toBirdResult(rawBird, media);
    assertEquals(result.name, "Testing Bird");
    assertEquals(result.inat_photos?.length, 1);
    assertEquals(result.sounds?.length, 1);
});

Deno.test("IdentificationService.mapBirdToSighting should correctly map bird to sighting structure", () => {
    const bird: any = {
        name: 'Northern Cardinal',
        scientific_name: 'Cardinalis cardinalis',
        confidence: 0.95,
        taxonomy: { family: 'Cardinalidae', order: 'Passeriformes' },
        description: 'A bright red bird.',
        inat_photos: [{ url: 'http://image.jpg', attribution: 'test', license: 'cc' }],
        sounds: [{ url: 'http://sound.mp3', id: '123' }]
    };
    const userId = 'user-123';

    const sighting = IdentificationService.mapBirdToSighting(bird, userId);

    assertEquals(sighting.user_id, userId);
    assertEquals(sighting.species_name, bird.name);
    assertEquals(sighting.scientific_name, bird.scientific_name);
    assertEquals(sighting.metadata.taxonomy.family, bird.taxonomy.family);
    assertEquals(sighting.metadata.taxonomy.order, bird.taxonomy.order);
    assertEquals(sighting.confidence, bird.confidence);
    assertEquals(sighting.metadata.description, bird.description);
    assertEquals(sighting.metadata.inat_photos.length, 1);
    assertEquals(sighting.metadata.sounds.length, 1);
});

Deno.test("IdentificationService.mapBirdToSighting should handle optional audioUrl", () => {
    const bird: any = { name: 'Test Bird', scientific_name: 'Testus' };
    const userId = 'user-123';
    const audioUrl = 'https://storage.supabase.com/audio.wav';

    const sighting = IdentificationService.mapBirdToSighting(bird, userId, audioUrl);

    assertEquals(sighting.audio_url, audioUrl);
    assertEquals(sighting.user_id, userId);
});

Deno.test("IdentificationService.processStream - processes all chunk types", async () => {
    const chunks: IdentificationChunk[] = [];
    const callback = (c: IdentificationChunk) => chunks.push(c);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('{"type":"progress","message":"Starting"}\n'));
            controller.enqueue(encoder.encode('{"type":"candidates","data":[{"name":"Bird 1"}]}\n'));
            controller.enqueue(encoder.encode('{"type":"media","index":0,"data":{"inat_photos":[]}}\n'));
            controller.enqueue(encoder.encode('{"type":"done","duration":100}'));
            controller.close();
        }
    });

    const reader = stream.getReader();
    await IdentificationService.processStream(reader, callback);

    assertEquals(chunks.length, 4);
    assertEquals(chunks[0].type, "progress");
    assertEquals(chunks[1].type, "candidates");
    assertEquals(chunks[3].type, "done");
});

Deno.test("IdentificationService.parseError - handles JSON error", async () => {
    const mockResponse = {
        status: 429,
        text: () => Promise.resolve(JSON.stringify({ error: "Too many requests" }))
    } as any;

    const error = await IdentificationService.parseError(mockResponse);
    assertEquals(error.status, 429);
    assertEquals(error.message, "Too many requests");
});

Deno.test("IdentificationService.processStream - throws error if interrupted before candidates", async () => {
    const callback = () => { };
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('{"type":"progress","message":"Starting"}\n'));
            // Throwing an error mid-stream
            controller.error(new Error("Stream connection lost"));
        }
    });

    const reader = stream.getReader();

    try {
        await IdentificationService.processStream(reader, callback);
        throw new Error("Should have thrown a stream interruption error");
    } catch (error: any) {
        assertEquals(error.message, "Stream connection lost");
    }
});

Deno.test("IdentificationService.processStream - does NOT throw if interrupted after candidates", async () => {
    let errorCalled = false;
    const callback = (chunk: any) => {
        if (chunk.type === 'error') errorCalled = true;
    };
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('{"type":"candidates","data":[{"name":"Bird 1"}]}\n'));
            controller.error(new Error("Network glitch after results"));
        }
    });

    const reader = stream.getReader();

    // This should NOT throw because results were already received
    await IdentificationService.processStream(reader, callback);
    assertEquals(errorCalled, false);
});
