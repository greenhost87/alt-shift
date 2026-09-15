# Alt+Shift

A responsive cover-letter generator built for the Variant Group full-stack test assignment.

> **Current status:** the responsive application proxies the Variant Generation API through a server-only endpoint, displays cover letters as they stream, and saves only completed letters in versioned browser storage. Saved applications survive reloads, synchronize across tabs, and update progress toward the five-letter goal.

## Stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite 8
- Reshaped with a custom theme and CSS Modules
- Valibot for runtime validation
- Bun as the runtime and package manager
- Playwright for browser tests

## Requirements

- [Bun](https://bun.sh/) 1.4.2 or newer

## Local development

Install dependencies:

```bash
bun install
```

Create the local environment file and set the server-only API token:

```bash
cp .env.example .env
```

Generation provider settings, field limits, product goals, initial content, and browser storage identifiers are documented in `.env.example`. `GENERATION_API_TOKEN` is the only required value without a default. Fresh browser storage starts with an empty application list and an empty generator form; the initial-content variables can provide explicit seed data when needed.

Start the development server:

```bash
bun run dev
```

Vite prints the local HTTPS URL after startup, usually `https://localhost:5173`. HTTPS is required for browser APIs such as clipboard access.

To test from a phone on the same network, expose the development server:

```bash
bun run dev -- --host 0.0.0.0
```

Open the printed network URL with `https://` and accept the development certificate warning once. Do not use the corresponding `http://` URL because Chrome disables clipboard access on insecure network origins.

Create a production build:

```bash
bun run build
```

## Commands

| Command               | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `bun run dev`         | Build the Reshaped theme and start Vite in development mode |
| `bun run build`       | Build the theme and production application                  |
| `bun run theme:build` | Generate the custom Reshaped theme                          |
| `bun run fmt`         | Format the repository with oxfmt                            |
| `bun test`            | Run Bun tests                                               |
| `bun run test:e2e`    | Run Playwright tests                                        |

## Project structure

```text
src/
├── components/
│   ├── features/    # Dashboard and application generator
│   ├── layout/      # Shell, workspace, grid, and section layouts
│   └── ui/          # Reusable buttons, fields, progress, and banner
├── routes/          # TanStack file-based routes
├── server/          # Server-only configuration utilities
├── styles/          # Global styles and self-hosted font declarations
├── system/theme/    # Theme source tokens
└── themes/variant/  # Generated Reshaped theme
```

The implementation plan and technical boundaries are documented in [`documents/architecture.md`](documents/architecture.md). The original assignment is available in [`documents/task.md`](documents/task.md).

## Product direction

The application:

- generates cover letters through Variant Group's streaming Generation API;
- keeps the API token on the server behind a same-origin endpoint;
- persists completed letters in versioned, validated `localStorage` data;
- restores saved letters after a reload and synchronizes browser tabs;
- tracks progress toward five completed applications;
- preserves partial output on generation failures so it can still be copied.

## AI-assisted workflow

AI tooling was used to inspect the repository, compare recurring UI patterns, scaffold focused components, and review implementation constraints. Visual details, component boundaries, responsive behavior, and server/browser security boundaries remained explicit engineering decisions rather than generated defaults.

Three decisions were kept deliberately narrow during that process:

1. Reuse Reshaped primitives and a project theme instead of introducing Tailwind or duplicating a second design system.
2. Keep application, generation, dashboard, and persistence state in an SSR-scoped Zustand store with selector-based subscriptions.
3. Proxy generation through server code instead of exposing the API token in the browser or replacing the required provider with another model API.

The most project-specific work is the theme and layout system: Fixel typography, reusable design tokens, responsive workspace composition, and the animated generation waiting state are implemented as a coherent product layer rather than page-specific styling.
