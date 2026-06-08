# Voice Testing (Local, Pre-Deploy)

## Environment setup

- Use Chrome in **Incognito** mode.
- Keep extensions disabled in that window to avoid interference/noise from tools like Sukha or chat-PDF extensions.
- Use a working microphone and grant mic permission when prompted.

## Step-by-step local test

1. Install deps (if needed) and run:
   - `npm run build`
   - `npm run lint`
2. Start local dev server:
   - `npm run dev`
3. Verify homepage is reachable:
   - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000`
   - Expect `200`.
4. In browser, open `http://localhost:3000`.
5. Click **Start session** to enter intake.
6. Switch to **Full voice mode**.
7. Click **Start mic**, speak for one prompt, and pause briefly.
8. Confirm transcript appears and step data updates, then continue through all prompts.
9. In check-in phase, use the voice mic and confirm transcript appears and maps to a check-in action.

## Diagnostics panel expectations (healthy behavior)

In guided intake and check-in voice cards, the diagnostics should show:

- Mic status toggles to **Listening...** when active.
- **Interim** transcript updates while speaking.
- **Final** transcript appears after phrase finalization/silence.
- Transcript text appears in the live transcript card (not stuck empty).
- No persistent voice error message (permission/gesture/no-microphone) during normal flow.

If recognition does not start after mode switch, click **Start mic** once manually to force a user-initiated start event.
