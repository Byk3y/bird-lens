# Implementation Plan: In-App Review Prompt for BirdMark

This plan outlines the steps to implement a custom in-app review pre-prompt for the BirdMark app using `expo-store-review` and `AsyncStorage`.

## 1. Setup & Dependencies
- Install the required package: `npx expo install expo-store-review`.

## 2. State Management (AsyncStorage)
Define and manage the following tracking keys in `AsyncStorage`:
- `successful_id_count` (number): Tracks total successful bird identifications.
- `review_prompt_dismissed_count` (number): Tracks how many times the user selected "Maybe Later".
- `review_submitted` (boolean): A flag to permanently prevent the prompt if the user agreed to review.

## 3. Custom Pre-Prompt Component
Create a new UI component for the custom pre-prompt screen (e.g., `ReviewPromptModal` or `AppReviewPrompt`).
- **Copy**: "Help fellow birders discover BirdMark — a quick review helps other birders find this app. It only takes a moment."
- **"Leave a Review" Action**:
  - Triggers the native review dialog using `StoreReview.requestReview()`.
  - Sets `review_submitted` to `true` in `AsyncStorage`.
  - Closes the custom prompt.
- **"Maybe Later" Action**:
  - Increments `review_prompt_dismissed_count` by `1` in `AsyncStorage`.
  - Closes the custom prompt.

## 4. Hook Modifications (`hooks/useBirdIdentification.ts`)
Update the identification success logic to handle the tracking and trigger conditions.
- **On Success**:
  - Increment the `successful_id_count` in `AsyncStorage`.
- **Trigger Evaluation**: Immediately after incrementing, evaluate if the pre-prompt should be shown:
  1. Abort if `review_submitted` is `true`.
  2. Abort if `review_prompt_dismissed_count` is `>= 2` (max 2 dismissals reached).
  3. Show the pre-prompt if:
     - The user has 0 dismissals AND `successful_id_count === 3`.
     - The user has 1 dismissal AND `successful_id_count === 6` (asked again after 3 more successful IDs).

## 5. Integration
- Render the new custom pre-prompt component globally (e.g., in `_layout.tsx`) or alongside the identification results screen.
- Manage the modal's visibility state, likely by exposing it from `useBirdIdentification` or a dedicated custom review hook.
