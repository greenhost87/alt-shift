# Rules of React

These are semantic constraints, not optional style preferences.

## Purity and render

- Components and Hooks must be idempotent: the same props, state, context, and Hook arguments must produce the same render result.
- Do not read changing non-React values such as `new Date()` or `Math.random()` directly during render when they affect output. Synchronize them outside render and store the result in state when the UI must update.
- Do not perform side effects during render. React may render repeatedly, pause, restart, or discard a render.
- Put interaction-caused side effects in event handlers. Put synchronization caused by rendering in an Effect, and use an Effect only when an event handler or render-time derivation cannot express the behavior.
- Do not change user-visible DOM or other external state during render. DOM synchronization belongs after commit, usually in an Effect.
- Local mutation is allowed only for a value freshly created within the current render, such as building a local array. Never mutate persistent, shared, prop, state, context, module, or external values.
- Lazy initialization is acceptable only when repeated calls are safe, isolated from other components, and do not alter observable render behavior. Prefer a lazy `useState` initializer for initial state and an Effect for later synchronization.

Purity lets React safely prioritize work, rerender, pause, and optimize components while keeping behavior predictable and locally understandable.

## Immutability

- Treat props and state as immutable snapshots. Create new values and use state setters instead of mutating either one.
- Treat arguments passed to Hooks and values returned by Hooks as immutable. A Hook may memoize from those identities.
- Treat a value as immutable after passing it to JSX because JSX may be evaluated eagerly. Complete any local construction before creating JSX, or create a new value.
- Treat custom Hooks as black boxes with stable contracts. Do not make callers depend on mutation of their inputs or outputs.

## React owns component and Hook invocation

- Render a component with JSX. Never call a component function directly.
- Never pass a Hook as a prop or ordinary value.
- Never select a Hook dynamically, decorate it at runtime, or create a higher-order Hook during render. Create static custom Hooks and place conditional behavior inside their implementation without changing Hook order.
- Prefer concrete component composition over dynamic component invocation. React-controlled invocation preserves identity, state, reconciliation, scheduling, and debugging.
- When testing, prefer behavior through real components and system boundaries over replacing component implementations; use E2E tests where practical.

## Rules of Hooks

Call conventional Hooks:

- only at the top level of a function component or custom Hook;
- before every possible early return;
- never in conditions, loops, nested functions, event handlers, class components, or `try`/`catch`/`finally`;
- never inside callbacks passed to `useMemo`, `useReducer`, or `useEffect`;
- never from ordinary JavaScript functions.

Custom Hooks may call Hooks, but custom Hooks themselves must obey the same call-site rules. Keep their names prefixed with `use` so tooling and readers can identify them.

React 19's `use` API is a narrow exception: it may read a context or promise inside conditions and loops. It still belongs in a component or Hook and must not be wrapped in `try`/`catch`; use an Error Boundary for rejected promises.

## Enforcement

Use Strict Mode and `eslint-plugin-react-hooks` when the repository configures them. Do not add, remove, or weaken project tooling unless the task explicitly requires it. Treat a clean lint result as support, not as a substitute for reviewing purity, ownership, and effect semantics.

## Sources

- https://react.dev/reference/rules
- https://react.dev/reference/rules/components-and-hooks-must-be-pure
- https://react.dev/reference/rules/react-calls-components-and-hooks
- https://react.dev/reference/rules/rules-of-hooks
