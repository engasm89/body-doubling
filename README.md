# Body Doubling Free MVP

Browser-first AI body-doubling coach built with Next.js App Router, Firebase Auth (anonymous), Firestore persistence, and optional OpenAI-compatible text generation.

## MVP Includes

- Intake flow: task, done definition, duration, difficulty, first tiny step
- Strict client session states: `idle -> intake -> active -> check_in -> recovery -> debrief -> complete`
- Timed check-ins at meaningful intervals (not every minute)
- Recovery logic for `stuck`, `distracted`, and `done_early`
- Debrief summary persistence and optional LLM-generated wrap-up
- Browser speech synthesis voice mode + animated speaking orb
- Vercel-compatible structure (Next.js API routes + App Router)

## Routing + API

- Canonical user flow runs on `/` (single-page state machine UX).
- Legacy UI routes (`/kickoff`, `/active`, `/check-ins`, `/debrief`) redirect to `/`.
- Canonical API routes:
  - `POST /api/sessions/start`
  - `POST /api/sessions/kickoff`
  - `POST /api/sessions/check-in`
  - `POST /api/sessions/recovery`
  - `POST /api/sessions/debrief`
- Legacy API routes still exist as thin wrappers for compatibility and forward to `/api/sessions/*`.

## Firestore Collections

- `users`
- `sessions`
- `session_goals`
- `check_in_events`
- `user_responses`
- `debrief_summaries`
- `coach_preferences`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for required values:

- Firebase client keys (`NEXT_PUBLIC_FIREBASE_*`)
- Firebase admin credentials for API persistence
- Optional OpenAI-compatible config (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`)

If `OPENAI_API_KEY` is missing, coach generation gracefully falls back to deterministic templates.
