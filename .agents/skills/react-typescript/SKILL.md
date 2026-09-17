---
name: react-typescript
description: Applies modern React rules, component/state/effect design, and strict TypeScript patterns when writing, changing, or reviewing React and TSX code.
---

# React and TypeScript practice

Use this skill for React components, Hooks, state design, Effects, context, refs, events, forms, Suspense, and React-facing TypeScript APIs.

## Load the relevant guidance

- Always read [`references/react-rules.md`](references/react-rules.md).
- For component boundaries, data flow, state, or Effects, read [`references/state-and-effects.md`](references/state-and-effects.md).
- For TSX types, Hooks, refs, context, events, or React-version APIs, read [`references/typescript.md`](references/typescript.md).

Repository instructions and installed React/TypeScript versions take precedence over stylistic recommendations in this skill. Never use a source example to bypass stricter local rules. This repository uses React 19; retain the version checks when applying the skill elsewhere.

## Working method

1. Inspect the existing component tree, data model, ownership, installed React types, and local conventions before editing.
2. Describe the UI as a component hierarchy. Keep each component focused on one concern; split only at a real responsibility or reuse boundary.
3. Build or reason about the props-only render path before adding interactivity.
4. List candidate state. Remove constants, props, and values derivable from props/state. Place each remaining value at the closest common owner of all consumers.
5. Keep data flowing down. Pass typed event callbacks upward when children need to request changes.
6. Classify every side effect by cause:
   - caused by a user interaction: run it in that event handler;
   - caused by the component being displayed or by external synchronization: use an Effect with complete dependencies and cleanup;
   - no external system: derive during render, reset with identity, or restructure state instead of using an Effect.
7. Model props, state, actions, events, refs, and context precisely. Prefer inference where it is exact; add explicit types at boundaries and where inference loses intent.
8. Review the result against the checklist below and the detailed references.

## Non-negotiable review checklist

- Render is idempotent and has no externally visible side effects.
- Props, state, Hook inputs/outputs, and values already passed to JSX are not mutated.
- Components are rendered with JSX, not called as ordinary functions.
- Hooks are static top-level calls in function components or custom Hooks; they are not injected, wrapped dynamically, or passed as values.
- State is minimal, normalized, and owned by the right component. Derived values are not synchronized through state.
- Effects synchronize external systems only. Dependencies are complete; subscriptions, timers, and async races are cleaned up.
- Interaction-specific work stays in event handlers. Display-specific work stays in Effects.
- Component props and callback signatures are precise; broad `Function`, `Object`, `{}`, avoidable `any`, and unsafe assertions are absent.
- Nullable state, refs, and context are checked at runtime rather than hidden with `!` or placeholder assertions.
- React-version-specific APIs use the installed version: React 19 ref-as-prop/context syntax where appropriate; legacy `forwardRef` only for older targets or existing compatibility constraints.
- Existing project formatting, linting, tests, E2E coverage, and verification requirements pass.
