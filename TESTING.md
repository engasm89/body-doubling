# Voice Intake Integration Checklist

## Manual test flow

- [ ] Open the app in a Chromium-based browser and go to intake.
- [ ] Click `Use mic` on the `Focus mission` field and allow microphone permission when prompted.
- [ ] Verify first click starts listening (status changes to listening) and transcript fills the field.
- [ ] Speak a structured sentence such as:
      `Task write onboarding copy, done merged PR, first step open doc, medium difficulty, 25 minutes`
      and verify `Focus mission`, `Success signal`, `First tiny action`, difficulty, and duration update.
- [ ] Submit intake and confirm network payload for `/api/sessions/start` includes:
      `task_title`, `desired_outcome`, `first_step`, `difficulty`, `duration`
      (camelCase aliases are also sent for backwards compatibility).
- [ ] Confirm `/api/sessions/kickoff` accepts the same payload and returns kickoff script.
- [ ] In a non-supported browser (or by disabling speech recognition), confirm banner appears:
      `Voice unavailable — type your answers`.
- [ ] Confirm typing still works for all intake fields and session start still succeeds.

## Regression checks

- [ ] Check check-in, recovery, and debrief flows still submit successfully.
- [ ] Verify no runtime errors in console after repeated `Use mic` / `Stop mic` toggles.
