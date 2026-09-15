# Alt+Shift

A responsive cover-letter generator built for the Variant Group full-stack test assignment.

> **Current status:** the repository contains the responsive UI prototype. The dashboard currently uses in-memory fixture data, and the generation form shows the waiting state without calling the Generation API. Streaming generation and browser persistence are not connected yet.

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

Start the development server:

```bash
bun run dev
```

Vite prints the local URL after startup, usually `http://localhost:3000`.

Create a production build:

```bash
bun run build
```

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Build the Reshaped theme and start Vite in development mode |
| `bun run build` | Build the theme and production application |
| `bun run theme:build` | Generate the custom Reshaped theme |
| `bun run fmt` | Format the repository with oxfmt |
| `bun test` | Run Bun tests |
| `bun run test:e2e` | Run Playwright tests |

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

The completed application is intended to:

- generate cover letters through Variant Group's streaming Generation API;
- keep the API token on the server behind a same-origin endpoint;
- persist completed letters in versioned, validated `localStorage` data;
- restore saved letters after a reload and synchronize browser tabs;
- track progress toward five completed applications;
- support cancellation, retries, copy actions, storage failures, and responsive layouts.

## AI-assisted workflow

AI tooling was used to inspect the repository, compare recurring UI patterns, scaffold focused components, and review implementation constraints. Visual details, component boundaries, responsive behavior, and server/browser security boundaries remained explicit engineering decisions rather than generated defaults.

Three decisions were kept deliberately narrow during that process:

1. Reuse Reshaped primitives and a project theme instead of introducing Tailwind or duplicating a second design system.
2. Keep route and generation state local until shared state is demonstrably required, rather than adding a global state library early.
3. Proxy generation through server code instead of exposing the API token in the browser or replacing the required provider with another model API.

The most project-specific work is the theme and layout system: Fixel typography, reusable design tokens, responsive workspace composition, and the animated generation waiting state are implemented as a coherent product layer rather than page-specific styling.
