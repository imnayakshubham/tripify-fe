# Multi-Agent Travel Planner — Web

The interface for a multi-agent trip planner. You describe a trip in plain language and get back a real trip page — a day-by-day timeline, the budget checked against your limit, and the destinations that were ruled out along with the constraint each one broke.

React 18 + TypeScript + Vite, with Tailwind v4 and shadcn/ui.

**This app does nothing on its own.** The agents, the orchestration and the database live in the API, which is a separate repository:
`https://github.com/YOUR-USER/trip-planner-backend` <!-- TODO: real URL -->

---

## Running it

Start the API first — nothing here works without it. Then:

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` — type-checks, then builds |
| `npm run preview` | serve the production build |
| `npm run lint` | oxlint |

### Pointing at the API

`VITE_API_BASE_URL` — defaults to `http://127.0.0.1:8000` if unset. Copy `.env.example` to `.env.local` to change it.

If Vite starts on **5174** instead of 5173, that is because 5173 was already taken. The API allows both by default, so it still works — but if you land on any other port, add it to `CORS_ORIGINS` on the API or every request fails a preflight and the UI reports it as the backend being unreachable.

### React 18 is pinned on purpose

`create-vite` installs React 19 today. The brief asks for React 18, so `react` and `react-dom` are pinned to `^18.3.1`. Check with `npm ls react` after any dependency change.

---

## How it talks to the API

Two clients, because one cannot do both jobs:

**`src/lib/api.ts`** — axios, for the four REST calls (`/health`, `/audit/requests`, `/audit/invocations`, `/metrics`, plus re-opening a saved plan). A request interceptor injects the identity headers; a response interceptor flattens FastAPI's two error shapes — `{detail: string}` and a 422's `{detail: [{loc, msg}]}` — into one `ApiError`.

**`src/lib/stream.ts`** — `@microsoft/fetch-event-source`, for `POST /plans/stream`. Axios is XHR-based in the browser and cannot read a response incrementally, and the native `EventSource` is GET-only and cannot set headers — which would force the identity stub into the query string for this one route. `fetchEventSource` does POST with headers, so the stream carries exactly the same identity as every other call.

Its defaults are hostile to a request that runs for a minute, so four things are set deliberately:

- `openWhenHidden: true` — otherwise the stream is torn down whenever the tab is hidden, which is fatal for a 30–60 second run.
- `onopen` checks `response.ok` and the content type, and throws a fatal error otherwise — this is what makes a 403 surface as a message rather than a retry storm.
- `onerror` rethrows. Returning would make it retry forever.
- `onclose` treats a close without a `done` event as a failure.

### Progress is real, not simulated

`src/hooks/usePlanStream.ts` reduces the event stream into render state. The API emits `start` → `routed` → one `agent` per node → `done`, and `routed` carries the supervisor's own `selected_agents` — so from the first event the UI knows the actual chain that will run. Nothing is advanced on a timer.

---

## The contract with the API

`src/types/api.ts` mirrors the API's response models, and **this is the only thing holding the two repositories together.**

The API deliberately returns `destination_choice`, `itinerary_plan` and `budget_assessment` as loose dictionaries rather than strict models, because they are unvalidated model output — a cost may arrive as `1200` or `"£1,200"`, and any key may be missing. Enforcing the shape server-side would turn a model quirk into a 500 on a run that otherwise succeeded. So the shape is enforced here instead, where being wrong is a compile error.

Two consequences worth knowing before you change anything:

- **Treat every field as optional**, and never assume a number is a number. `toNumber` in `src/lib/trip.ts` handles the string forms. It **must** stay in step with `to_number` in the API's `app/agents/base.py` — when this parsed a figure the server could not, the client reached a different verdict from the server on identical data and rendered a green "within budget" tick over a real overage.
- Pydantic serialises an optional field as present-and-`null`, so these are modelled `T | null`, not `T?`. `null` on one of the three structures means that agent did not run.

---

## What it renders

`src/components/PlanResult.tsx` composes the result page:

- **`TripHero`** — destination, duration, and cost against budget. The banner is a gradient hashed from the destination name rather than a photo: no network request, and it cannot show a picture of the wrong city.
- **`ConstraintsPanel`** — what the supervisor understood. Worth showing, because a wrong hard constraint here is where a confidently wrong plan starts.
- **`DestinationPanel`** — the recommendation, the runners-up, and **the ones ruled out with the reason**. That last list is the visible evidence for the API's hard-constraint filtering.
- **`BudgetPanel`** — total against the limit, breakdown by category sorted biggest-first, and when over: the percentage over, a marker showing where the limit sits, and the cheaper alternative with its itemised savings and whether they actually close the gap.
- **`ItineraryTimeline`** — days, each activity tagged by category with rough timings and any uncertainty flagged next to it rather than buried.

### Everything degrades

Each panel falls back to rendering the API's markdown when its structured data is absent, and the raw markdown stays available behind a toggle. A model that ignores the JSON schema costs the timeline view and nothing else — it never blanks the screen.

The budget verdict is three-state — within, over, or **could not be verified**. A missing flag is never read as "fine"; that fail-open default is exactly how overages used to slip through.

---

## Layout

```text
src/
  App.tsx                 shell: sidebar + main view
  main.tsx
  index.css               Tailwind v4 theme tokens, light and dark
  types/api.ts            mirrors the API's response models
  lib/
    api.ts                axios client, ApiError
    stream.ts             SSE client
    identity.ts           the header-based identity stub
    trip.ts               money/category/budget helpers
    agents.ts             agent label formatting
  hooks/
    usePlanStream.ts      reduces the SSE events into render state
    useApiResource.ts     small GET loader with loading/error/403
  components/
    ui/                   shadcn-generated
    …                     everything else is app code
```

Theme tokens live in `src/index.css`. The five `--chart-*` variables are the activity-category palette — evenly spaced hues at matched lightness, defined for both light and dark.

## Identity and roles

There is no real auth. `src/lib/identity.ts` holds an email and a role in `localStorage` and sends them as `X-User-Email` / `X-User-Role` on every request, including the stream. The API believes them — that is the stub, and it is the API's decision.

The role is sent explicitly rather than omitted, because the API writes it onto the user row; sending it keeps the client's idea of the role and the server's in agreement instead of letting them drift. Switching to `admin` reveals the Metrics view and the per-plan cost breakdown — both of which the API enforces server-side, so this is a real boundary and not a hidden tab.

## Known gaps

**Not deployed.** Runs locally against a local API.

**No router.** Navigation is component state, so there are no deep links, no shareable URLs and no back-button support. A real version would put the plan id in the URL.

**No tests.**

**Visual polish is deliberately limited** — the brief asked for that explicitly. shadcn defaults throughout.
