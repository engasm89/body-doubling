# FORAshraf.md

## Introduction

This project is a free, browser-first body-doubling coach: a focused companion that nudges you at the right moments, then gets out of your way. Think of it like having a calm accountability partner sitting beside you while you work, except it never gets tired, never judges you, and can adapt its tone based on whether you are on track, stuck, or distracted.

The MVP goal is practical: get users from "I should start" to "I finished a block" with almost zero friction. That is why anonymous auth, browser TTS, and short structured prompts matter here more than fancy features.

## Technical Architecture

At a high level, the app has three layers:

1. **Client session experience** (single-page App Router UI)
2. **Server API routes** (kickoff/recovery/debrief generation + persistence)
3. **Firebase data layer** (anonymous users + Firestore collections)

If we use an analogy: this app is like a gym circuit timer with a coach:
- The **UI** is the timer screen and controls.
- The **state machine** is the workout routine (which step can come next).
- The **API routes** are the coach's script cards.
- **Firestore** is the workout logbook.

### End-to-end flow

1. User lands on `"/"` and signs in anonymously via Firebase Auth.
2. User fills intake details (task, done definition, duration, difficulty, first step).
3. Client calls `POST /api/start-session`:
   - creates/updates `users`
   - creates `sessions` row with schedule + state
   - creates `session_goals`
   - upserts `coach_preferences`
4. Client calls `POST /api/generate-kickoff` and optionally speaks the kickoff text using browser SpeechSynthesis.
5. During `active` state, local timer checks schedule checkpoints.
6. At checkpoint, state moves to `check_in`; user picks a quick status.
7. For non-`on_track`, client calls `POST /api/generate-recovery-prompt`.
8. Every check-in calls `POST /api/save-check-in` (persists event + response).
9. End phase calls `POST /api/save-debrief` (persists summary + closes session).
10. State moves to `complete`; user can start another block.

## Codebase Structure

### App Router

- `src/app/page.tsx`  
  Entry route that renders the primary MVP page component.

- `src/components/mvp-home-page.tsx`  
  Main orchestration UI. Contains:
  - strict phase transitions
  - intake form
  - active timer and check-in triggers
  - recovery/debrief flows
  - TTS toggling and speaking orb behavior

### API routes

- `src/app/api/start-session/route.ts`
- `src/app/api/generate-kickoff/route.ts`
- `src/app/api/generate-recovery-prompt/route.ts`
- `src/app/api/save-check-in/route.ts`
- `src/app/api/save-debrief/route.ts`

These map directly to the MVP contract and are Vercel-compatible route handlers.

### Logic and data utilities

- `src/lib/schedule.ts`  
  Builds meaningful check-in schedules by session length.

- `src/lib/state-machine.ts`  
  Enforces legal transitions:
  `idle -> intake -> active -> check_in -> recovery -> debrief -> complete`

- `src/lib/coach/templates.ts`  
  Rule-based fallback messages for kickoff/recovery/debrief.

- `src/lib/coach/llm.ts` and `src/lib/coach/engine.ts`  
  OpenAI-compatible text generation, with graceful fallback when no API key exists.

- `src/lib/server/session-store.ts`  
  Firestore persistence helpers for sessions, check-ins, responses, and debrief data.

- `src/lib/firebase/client.ts` / `src/lib/firebase/admin.ts`  
  Client SDK and admin SDK initialization.

### UI helpers

- `src/components/speaking-orb.tsx`  
  Animated orb that pulses while speaking.

- `src/lib/tts.ts`  
  Browser SpeechSynthesis wrapper (`speak`, `stop`, capability check).

## Technologies Used (and why)

- **Next.js 16 (App Router)**  
  Fast path to browser + API in one repo, deployment-ready on Vercel.

- **React 19 + TypeScript**  
  Predictable stateful UI for a multi-stage interaction flow.

- **Tailwind CSS**  
  Rapid iteration for an accessible mobile-friendly interface.

- **Firebase Auth (anonymous mode)**  
  Removes signup friction, perfect for "just start now" behavior.

- **Firestore**  
  Flexible schema for evolving session/check-in/debrief events.

- **Firebase Admin SDK in API routes**  
  Secure server-side persistence for session events.

- **Browser SpeechSynthesis**  
  Zero-cost voice output without realtime voice infrastructure.

- **OpenAI-compatible endpoint**  
  Swap model providers later while preserving same API pattern.

## Technical Decisions and Trade-offs

### 1) Anonymous auth first, identity later
- **Decision**: use anonymous auth immediately.
- **Why**: body-doubling only works if session start friction is close to zero.
- **Trade-off**: identity continuity across devices is weaker unless upgraded account linking is added later.

### 2) Hybrid rules + LLM instead of LLM-only
- **Decision**: deterministic templates plus optional LLM personalization.
- **Why**: keeps baseline quality and reliability even when API keys are missing.
- **Trade-off**: copy feels less "fresh" in fallback mode, but UX reliability is far better.

### 3) Local timer + server event persistence
- **Decision**: timer runs client-side; events persist server-side.
- **Why**: responsive UX plus durable historical records.
- **Trade-off**: client clock drift is possible; acceptable for MVP accountability use case.

### 4) Strict state machine
- **Decision**: enforce allowed transitions at runtime.
- **Why**: prevents "weird" UI states and accidental phase skips.
- **Trade-off**: adds some upfront complexity, but dramatically reduces flow bugs.

## Lessons Learned

### The "Looks Empty" Trap

Early inspection suggested a nearly blank template, but deeper recursive scanning revealed a lot of pre-existing session modules.  
**Lesson**: always run broad path discovery before major edits in repos that may have partial scaffolds.

### Duplicate Architecture Risk

There were parallel patterns for session flow and API routes. The fix was to anchor the MVP around one clear path (`page -> API routes -> server store`) while preserving compatibility where practical.  
**Lesson**: in fast-moving MVP codebases, duplicate patterns appear quickly; converging on one happy path is critical.

### Firebase Initialization Gotcha

Top-level strict initialization can crash imports in non-configured environments.  
**Lesson**: prefer graceful initialization and clear runtime error messages close to where data operations happen.

### LLM Dependency Safety

If generation is hard-required, missing keys can block the whole product.  
**Lesson**: fallback templates are not "nice to have"; they are reliability infrastructure.

## Best Practices and Engineering Patterns

- Keep AI prompts short and purpose-built for each moment (`kickoff`, `recovery`, `debrief`).
- Make state transitions explicit and testable instead of ad-hoc `if` chains.
- Persist user events as append-only records (`check_in_events`, `user_responses`) for future analytics.
- Treat "on track" as a quiet state to avoid notification fatigue.
- Use mobile-first layout decisions even for web MVPs, because focused sessions often happen on phones.

## Bugs, Pitfalls, and Future-Proofing

### Pitfall: Over-coaching
If the coach talks too often, users bounce.
- **Mitigation**: fixed interval schedules and hard rule to go quiet on `on_track`.

### Pitfall: State drift across UI and server
If client phase and DB status diverge, behavior gets confusing.
- **Mitigation**: server writes on each key event and strict transition checks client-side.

### Pitfall: Prompt sprawl
One giant prompt for everything becomes brittle.
- **Mitigation**: separate prompt surfaces by stage and preserve template fallback behavior.

## How good engineers think in this project

In this MVP, good engineering is not about "most advanced AI stack." It is about reducing failure modes:

- remove friction before adding features
- ensure predictable behavior before personalization
- keep architecture simple enough to ship, but structured enough to evolve

If you keep only one mental model: build this product like a reliable metronome, not a fireworks show. Reliability creates habit; habit creates value.
# FORAshraf.md

## Introduction

This MVP is basically a "focus co-pilot" for people who freeze, drift, or overthink when working alone. The product idea is simple: do not ask users to be perfect, ask them to stay in motion. The app nudges them through five moments:

1. **Intake** (what matters now)
2. **Kickoff** (commit to a start)
3. **Active** (work block)
4. **Check-ins** (course-correct)
5. **Debrief** (learn and reset)

If productivity tools are usually a spreadsheet, this one tries to feel more like a coach in the room.

## Technical Architecture

Think of architecture as a two-lane road:

- **Lane 1: Client experience lane**  
  Next.js App Router pages render the user journey and keep immediate UI state responsive.

- **Lane 2: Server persistence + coaching lane**  
  API routes and server helpers persist session data and generate coach-style prompts/replies.

At runtime, it looks like this:

`UI Pages -> Context/Hooks -> API Routes -> Server Store -> Firebase`

### Why this split?

- The UI stays fast and interactive (local state for immediate transitions).
- The backend can evolve independently for stronger data durability and smarter coaching logic.
- It avoids a common MVP trap: coupling every click directly to the database, which slows iteration.

## Codebase Structure

Key areas and what they do:

- `src/app`  
  App Router pages and API endpoints.  
  - `src/app/page.tsx`, `src/app/kickoff/page.tsx`, `src/app/active/page.tsx`, `src/app/check-ins/page.tsx`, `src/app/debrief/page.tsx` define the guided flow UI.
  - `src/app/api/...` contains server endpoints for sessions, check-ins, debrief, and AI-style prompts.

- `src/components`  
  UI building blocks and composition wrappers.  
  - `src/components/providers.tsx` wires auth/session providers into layout.
  - `src/components/session/*` contains reusable session primitives (intake form, timer, coach message, check-in controls, debrief form).

- `src/context` and `src/hooks`  
  Shared state + hooks glue.  
  - Auth state and session state orchestration live here.

- `src/lib/firebase` and `src/lib/server`  
  Data and auth integration layer.  
  - Firebase client/admin setup
  - Firestore write helpers
  - Server-side session store logic

## Technologies Used (and why)

- **Next.js App Router**: rapid full-stack delivery with colocated API routes.
- **TypeScript**: catches integration mistakes early (huge in parallel-agent workflows).
- **Tailwind CSS**: fast UI iteration without CSS architecture overhead during MVP.
- **Firebase Auth + Firestore + Firebase Admin**: quickest path to auth + persistence for a SaaS MVP.
- **LLM integration hooks (OpenAI-compatible)**: enables coach prompt generation without locking into a rigid prompt model.

## Technical Decisions and Trade-offs

### 1) Session engine convergence
- **Decision**: make the strict state-machine engine the canonical session orchestrator.
- **Why**: one transition model is easier to reason about than multiple loosely-coupled flows.
- **Trade-off**: migration work to rewire UI and API callers safely without redesigning UI.
- **Result**: `/` now runs on the canonical engine, and legacy pages are compatibility redirects.

### 2) Lazy Firebase Admin initialization
- **Decision**: initialize Firebase Admin only when server functions are actually invoked.
- **Why**: allows `next build` to pass in environments where admin secrets are not present at build time.
- **Trade-off**: missing env vars fail at request runtime (not import/build time).
- **Benefit**: safer CI and easier contributor onboarding.

### 3) Strong typing with pragmatic boundaries
- **Decision**: keep strict types, but loosen some Firestore helper return generics where SDK timestamp field typing became brittle.
- **Why**: unblock integration build without weakening domain types.
- **Trade-off**: slightly less strict return-type precision in write helpers.

## Lessons Learned

### Lesson 1: Parallel work is powerful, but glue code is where reality hits

Most teams underestimate integration work. Building features in parallel is the easy part. Getting all assumptions to match is hard. We saw this with:

- duplicate/overlapping session abstractions,
- route/client contract drift,
- strict typing mismatches around Firestore timestamps.

**Takeaway:** Allocate explicit "integration ownership" early. Without it, each feature is correct in isolation and broken in aggregate.

### Lesson 2: Build-time failures are often architecture signals

When build failed due to eager Firebase Admin env validation, it exposed hidden coupling between deployment environment and module import timing.

**Fix used:** lazy admin initialization.  
**Mindset:** "What should fail at import time vs runtime?" is a design decision, not just a bug fix.

### Lesson 3: Type errors are not friction, they are feedback

The Firestore generic mismatch looked annoying, but it was really saying: "your data write layer and your typed domain layer are not perfectly aligned."

**Good engineers do this:** treat type failures as architecture diagnostics, not compiler nagging.

## Pitfalls to Avoid Next

- Do not re-introduce competing session orchestrators.
- Keep one canonical API contract (`/api/sessions/*`) and centralize request types from it.
- Avoid top-level env validation in modules that are imported during build analysis.
- Add a small set of integration tests that walk the full user path (intake -> debrief).

## Best Practices Going Forward

- Choose one source of truth for session state transitions.
- Keep API payload validators strict and colocated with shared types.
- Make build checks part of every integration branch handoff.
- Keep "glue changes" small and reviewable; these files are where regressions hide.

## Strongest Case Against Current Direction (Devil's Advocate)

If we are brutally honest: the biggest risk is not whether this app can run, it is whether it can stay coherent as features grow. Right now the codebase already shows signs of split-brain session logic. If left unchecked, velocity drops, bug rates rise, and onboarding gets painful.

**Stronger alternative approach:**  
Treat the session engine as a product primitive. Build around one state model, one API contract layer, and one storage write path. Everything else (pages, components, prompts) plugs into that spine.

In startup terms: "fancy UI on top of ambiguous domain logic" feels fast this week and expensive next month. The better bet is to lock the domain flow now while the surface area is still small.
