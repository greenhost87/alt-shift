---
name: code-rules
description: Applies the enforced alt-shift TypeScript, module-layout, parsing, database, UI, and test coding rules. Use whenever writing, changing, or reviewing code in this project.
---

# alt-shift code rules

Apply these constraints while designing a change. `AGENTS.md` remains authoritative for product, safety, documentation, and verification workflow.

## TypeScript and module shape

- Write strict ESM TypeScript. Preserve configured compiler constraints and aliases (`{}`).
- Validate untrusted values and keep precise types. Do not use `any`, non-null assertions, unsafe assertions, double assertions through `unknown`, unsafe value flows, or `unknown` parameters.
- Define explicit named object shapes. Do not use `Pick`, `Omit`, `Partial`, `NonNullable`, intersections, indexed-access types, empty interfaces, identity aliases, or aliases that merely rename an export.
- Derive exported string-literal types from one runtime catalog declared `as const`. Keep `*.types.ts` files type-only.
- Use separate type-only imports and exports. Export declarations from their owner; do not add barrels, forwarding exports, export proxies, or runtime re-exports.
- Prefer functions and data. Runtime classes are forbidden except names ending in `Error` or `Element`.
- Use static imports. Dynamic `import()` is allowed only in configured runtime-boundary files with relative string literals.
- Extract inline parameter object types above 3 members. Keep files within code-line limits (**/*.{ts,tsx,mts,cts}: 400; **/*.tsx: 500; later matching scopes take precedence), excluding imports, comments, and blank lines.
- Handle promises explicitly: no floating promises, async executors, thenable misuse, or pointless `async`/`await`.
- Follow the project formatter (`{"$schema":"./node_modules/oxfmt/configuration_schema.json","singleQuote":true,"sortPackageJson":true}`).

## Reachability, reuse, and complexity

- Every production file, export, type, dependency, enum member, and class member must be reachable and used. Delete obsolete API and migrate consumers directly; never add artificial usages.
- Keep imports resolvable and dependencies declared. Avoid circular imports, re-export cycles, duplicate exports, and boundary violations.
- Avoid thin forwarders, constant wrappers, identity aliases, thin UI wrappers, duplicated prop shapes, and speculative micro-modules.
- Keep cyclomatic complexity at most 20, cognitive complexity at most 15, and component complexity at most 8.
- Avoid near-duplicate blocks from 30 tokens and 3 lines. Reuse the smallest real shared primitive.
- Do not suppress diagnostics. Disable directives are forbidden; suppressions require reasons and cannot become stale.

## Placement and package boundaries

- Watched roots: `src/components/ui`, `src/components/layout`, `src/components/features`. Put modules below a real concern directory.
- Concern-depth limits: `{"src/components/ui":2,"src/components/layout":2,"src/components/features":2}`. Direct TypeScript-file caps: `{"src/components/ui":12,"src/components/layout":12,"src/components/features":12}`.
- Concern-prefixed basenames are forbidden under `src/components/ui`, `src/components/layout`, `src/components/features`, except an exact mirrored name.
- Test colocation policy: `application`. Application tests belong under root `tests/`; helpers belong in `tests/support/` or `tests/setup/`.
- Allowed root modules: none. Package dependencies: `{}`. Private roots: `[]`.

## React and Next.js

- Keep shared primitives in UI, shell/chrome in layout, and domain UI in its feature. Features cannot import other features; UI and layout cannot import features.
- Use shared UI from application views. Low-level UI libraries and ad-hoc markup/styles belong only inside configured UI/layout boundaries.
- Do not spread props into JSX or element-construction prop bags. Fixed specialization props must follow forwarded props; prefer the primitive directly.
- Keep render and memo calculations pure. Do not mutate props/state aliases, call impure APIs during render, set state during render, create nested components, or construct unstable context values.
- Follow Hooks dependencies and ordering. Supply stable keys, explicit button types, safe target links and iframes, controlled-input handlers/readOnly, and valid DOM properties.

## Configuration and parsing

- Read environment variables only through `system/config/environment.ts`. Never access or destructure `process.env` elsewhere.
- Do not use `v.custom` or exported trivial Valibot schema aliases.
- Parse structured external/file data with Bun and a concrete Valibot schema; infer output with `v.InferOutput`. Avoid raw JSON parsing, handmade generic JSON types, loose records, and manual object/array narrowing.
- Keep `scripts/` CLI-only; production modules cannot import from it.

## Tests and Playwright

- Exercise imported production implementations. Do not replace, spy on, mutate, hand-port, or copy project implementation modules. Only external packages and builtins are mockable boundaries.
- Keep expectations independent of production logic. Do not leave skipped/focused tests, JSON clone tricks, double-wrapped equality assertions, or inline multiline test data.
- Playwright specs use `tests/e2e/**/*.pw.ts`, `@playwright/test`, and the `page` fixture. Treat the app as a black box; do not import database internals, launch browsers, or spawn servers in specs.
- No external Playwright mock origins are configured; do not add route, HAR, or WebSocket substitutions.
