# Future Tricks & Enhancements 🚀

This document outlines advanced features and strategies to further improve the Birdsnap identification accuracy and user experience.

## 1. Vision & Reasoning Improvements
### "Describe Before Decide" (Anatomical Checklist)
- **Concept:** Force the AI to describe specific anatomical features (beak shape, eyelines, wing bars, leg color) before providing an identification.
- **Benefit:** Increases precision by focusing the model on diagnostic field marks rather than general color patterns.

### Direct "Look-alike" Comparison
- **Concept:** Add a `distinguish_from_lookalikes` field to the AI output.
- **Benefit:** Explicitly explains how to tell the identified bird apart from its closest visual "twins" (e.g., Cooper's Hawk vs. Sharp-shinned Hawk).

## 2. Contextual Data Integration
### Geolocation Grounding
- **Concept:** Pass the user's GPS coordinates or City/State to the AI prompt.
- **Benefit:** Helps the AI distinguish between sibling species that live on different continents or in different regions.

### eBird "Local Sighting" RAG
- **Concept:** Use the eBird API to fetch a list of birds seen nearby in the last 7 days and feed this list to the AI.
- **Benefit:** Provides "real-world" probabilities, making the AI guess more like a local field expert.

## 3. Audio Identification Tricks
### Spectrogram Visualization
- **Concept:** Generate a heat-map of sound frequencies (spectrogram) on the phone while the AI processes audio.
- **Benefit:** Allows users to "see" the bird's song and provides a high-tech visual experience during the identification wait time.

## 4. UI/UX Refinement
### Progressive Confidence UI
- **Concept:** Use NDJSON streaming to show the name and "thinking" of Candidate #1 as soon as it arrives, before the full media (photos/sounds) has finished fetching.
- **Benefit:** Eliminates the feeling of latency and makes the app feel "instant."

---
*Created on 2026-02-16 based on AI vision research.*
