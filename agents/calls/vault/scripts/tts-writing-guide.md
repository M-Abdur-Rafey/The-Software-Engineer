# TTS Voice Script Writing Guide

## Core rules

1. **Short sentences** — max 20 words. TTS rushes long sentences.
2. **Spoken language** — "you'll" not "you will". Natural contractions.
3. **Spell out numbers** — "eight hundred" not "800". "five fifty-five, one two three four" for phone numbers.
4. **No punctuation TTS reads aloud** — no em dashes, no parentheses in speech paths.
5. **Brand names** — add phonetic hints in square brackets if TTS mispronounces: "Aris[trull]"
6. **Timing** — 130 words/minute is average TTS speed. 8-second greeting = ~17 words max.

## Script templates

### Greeting (max 17 words)
✅ "Thank you for calling [Company]. This call may be recorded."
❌ "Thank you for calling [Company], a leading provider of software solutions established in 2020."

### Main menu
✅ "Press 1 for support. Press 2 for billing. Press 0 to speak with someone."
❌ "In order to route your call to the correct department, please listen carefully to the following options..."

### Transfer
✅ "Please hold. I'm connecting you now."
❌ "One moment please while I transfer your call to the next available representative."

### Voicemail prompt
✅ "No one is available right now. Please leave your name and number after the tone."

### After-hours
✅ "Our office is closed. We're open Monday through Friday, nine to five. Please call back then, or leave a message."

### Outbound intro (must identify company in first 5 words)
✅ "Hello, this is [Company] calling for [Name]."
❌ "Hi there, how are you doing today? I'm calling because..."

### Error / didn't understand
✅ "I didn't catch that. Let me repeat the options."

### Goodbye
✅ "Thank you for calling [Company]. Have a great day. Goodbye."

## Accessibility notes
- Offer a "press 0 for a person" option on every menu level
- Keep hold music volume lower than voice prompts
- Repeat menu options after 5-second silence (timeout) before fallback
