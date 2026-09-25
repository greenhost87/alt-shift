# Component, state, and Effect design

## Think in React

### 1. Build a component hierarchy

- Start from the mockup and data model. Draw and name components and arrange them by containment.
- Use separation of concerns: a component should ideally have one responsibility. Split it when a distinct concern becomes complex, independently reusable, or independently understandable—not merely to reduce line count.
- Let the information architecture guide the UI hierarchy; well-shaped API data often maps naturally to component boundaries.

### 2. Build the static render path first

- First render the data model with components and props, without interactivity or state.
- Use top-down construction for small UIs; bottom-up construction can be easier for large UIs with reusable leaves.
- Keep one-way data flow explicit: parents pass data to children through props.

### 3. Find minimal complete state

For every candidate value, ask:

1. Does it remain unchanged? Then it is not state.
2. Does a parent provide it? Then it is a prop, not duplicated state.
3. Can it be computed from current props or state? Then derive it during render.
4. Otherwise, does the UI need to remember it across renders? Then it is probably state.

Store the smallest changing source of truth and compute counts, filtered collections, labels, validation summaries, and other projections on demand.

### 4. Place state deliberately

For each state value:

1. Identify every component that renders from or changes it.
2. Find their closest common parent.
3. Keep the state in that parent or, if ownership demands it, in a component above it.
4. Create a dedicated owner only when no existing component is a coherent owner.

Pass values down and typed callbacks down. A child requests changes from an event handler; the owner performs the update. Prefer a fully controlled child when parent and child must always agree.

## Decide whether an Effect is needed

Effects are escape hatches for synchronizing React with an external system. If no external system exists, do not add an Effect.

Use this order:

1. Derive pure values during render.
2. Handle user-caused work in the initiating event handler.
3. Reset a conceptual component by changing its `key` when identity changes.
4. Lift state or make the component controlled when two components must stay synchronized.
5. Use `useSyncExternalStore` for external subscriptions.
6. Use an Effect only for synchronization caused by rendering.

### Replace unnecessary Effects

- **State derived from props/state:** compute it during render. Do not Effect-set `fullName`, filtered data, totals, or flags.
- **Expensive pure calculation:** calculate normally first. If measurement shows meaningful cost, memoize with `useMemo`; do not copy the result into state. Memoization is a performance optimization, not a correctness mechanism.
- **Reset all state when identity changes:** split the conceptual child and give it a key based on identity. React will recreate the subtree and reset all local state.
- **Adjust only part of state on a prop change:** first store a stable identifier and derive the selected item. React documents a guarded same-component render update as a last resort, but this repository forbids setting state during render; restructure, derive, key, or lift state instead.
- **Share logic between handlers:** extract a plain function and call it from each relevant handler. Do not infer which user action occurred from an Effect.
- **Send a request caused by submission/purchase/action:** send it in that event handler. An Effect is suitable only for a request caused by the component becoming visible or by visible synchronization inputs changing.
- **Chains of computations:** compute derived values during render and calculate related next state together in the initiating handler. Avoid one Effect triggering state that triggers another Effect.
- **Initialize the application once:** use framework/root initialization or guarded module-level initialization at the application entry boundary. Do not assume an empty-dependency Effect runs exactly once across remounts.
- **Notify a parent of local changes:** update local and parent state in the same event, or make the child controlled. Do not notify through an Effect after the fact.
- **Pass fetched data upward:** let the parent own the fetch and pass data down. Do not fetch in a child and relay results upward through an Effect.
- **Subscribe to an external store:** use `useSyncExternalStore` with subscribe/unsubscribe and client/server snapshots rather than a hand-written Effect subscription.

## Appropriate Effects

Use an Effect for synchronization with something outside React, including:

- browser APIs and imperative DOM state;
- non-React widgets;
- timers and subscriptions;
- network data whose result must track the currently displayed query, route, or page;
- analytics or notifications caused by a component being displayed rather than by one particular interaction.

For every Effect:

- include every reactive input it reads;
- make setup safe to repeat;
- return cleanup for subscriptions, timers, listeners, or resources;
- prevent async races by aborting obsolete work when supported or marking old requests stale and ignoring late responses;
- avoid waterfalls and duplicate requests; prefer framework data loading, server fetching, caches, or a reusable data Hook when available;
- represent loading and error states deliberately;
- do not return anything except a cleanup function or `undefined`.

The diagnostic question is causal: **did this code run because the component was displayed/synchronized, or because the user performed a specific action?** The former may be an Effect; the latter belongs in the event handler.

## Source

- https://react.dev/learn/thinking-in-react
- https://react.dev/learn/you-might-not-need-an-effect
