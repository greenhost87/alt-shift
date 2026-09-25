# React with TypeScript

Target the installed React, `@types/react`, and TypeScript versions. The modern guidance below assumes React 19 and current TypeScript; legacy notes are for maintaining older targets.

## Function components and props

- Prefer ordinary function components with a named, precise props shape. Let the JSX return type infer, or annotate `React.JSX.Element` when an explicit boundary is useful.
- `React.FC` / `React.FunctionComponent` is generally unnecessary. With current types it is mostly stylistic; ordinary functions are clearer and avoid historical `defaultProps` issues.
- Use `children?: React.ReactNode` for anything React can render. Use `React.JSX.Element` when exactly one React element is required.
- Use literal unions for closed variants, explicit object shapes for structured data, and exact callback signatures such as `(id: string) => void`.
- Use `React.Dispatch<React.SetStateAction<T>>` only when a child truly receives the state setter contract; prefer a domain callback when callers should not control update mechanics.
- Use `React.CSSProperties` for a typed style object when inline styles are appropriate under project rules.
- For native-element or component wrappers, `ComponentPropsWithoutRef<"button">` and `ComponentPropsWithRef<T>` can derive compatible props. Follow local restrictions on utility types and prop spreading; in this repository define explicit shapes and forward props explicitly when required.
- Use `type` for unions and often for local props/state. Interfaces are useful for public library APIs that intentionally allow declaration merging. Follow repository conventions rather than debating style.
- Generic components should carry one type parameter through related fields, for example `items: T[]` and `onSelect: (item: T) => void`, so callers retain inference.

## Avoid weak and dishonest types

- Do not use `Function`; declare parameters and return type.
- Avoid `object` unless the contract truly accepts every non-primitive value.
- Do not use empty interfaces, `{}`, or `Object` to mean “empty object”; they accept every non-nullish value. Declare the actual shape or use an appropriate record/union.
- Avoid `any` and broad assertions. Validate unknown external data and narrow it.
- Do not initialize state with `{ } as T`, context with `{ } as T`, or refs with `null!`. These lie to the compiler and can fail at runtime.
- Prefer nullable unions and runtime checks. Assertions are escape hatches only when the runtime invariant has already been established and cannot be represented more safely.

## State, callbacks, and reducers

- Let `useState` infer simple initial values.
- Write an explicit union for nullable/deferred values: `useState<User | null>(null)`.
- Type `useCallback` like any function. Annotate parameters when contextual inference is unavailable; current React types expose implicit `any` instead of silently accepting it.
- Model reducer actions as discriminated unions. Give the reducer an explicit state return type so every branch must return a valid state.
- Let `useReducer` infer state and dispatch where it can. Supply explicit state/action generics only when inference genuinely fails.
- Effect and layout-effect callbacks return only cleanup or `undefined`. Use a block body when an expression such as `setTimeout(...)` would otherwise be returned accidentally, and clear the timer in cleanup.

## Refs and imperative handles

- Give `useRef` an initial value. Current React types return `RefObject<T>`; `MutableRefObject` is deprecated.
- For DOM refs, use the most specific element type and initialize with `null`, for example `useRef<HTMLInputElement>(null)`. Check `.current` before use because conditional rendering and unmounting can make it null.
- For mutable values that do not trigger rendering, include the real initial/null state, such as `useRef<number | null>(null)`, and manage cleanup.
- In React 19, receive `ref` as a normal prop typed as `React.Ref<T>` or inherit it with `ComponentPropsWithRef`. Do not add `forwardRef` solely for React 19.
- Use `useImperativeHandle(ref, () => handle)` only when the parent needs a deliberate imperative API. Export a precise handle type and expose the smallest necessary surface.
- For generic components, an explicit typed ref prop is often the clearest option. More elaborate `forwardRef` redeclarations/call signatures are library-level techniques.
- For React 18 and earlier, use `forwardRef<RefType, Props>`; `createRef` is mainly for class components. Treat these as compatibility patterns, not the React 19 default.

## Custom Hooks

- Keep custom Hook inputs and outputs precise and immutable.
- For two-position array returns, preserve tuple positions with an explicit tuple type or `as const` when local rules allow it.
- Prefer an object return when a custom Hook returns more than two values.
- Export consumer-facing types when authoring a Hook library.
- Keep Hook selection and call order static; pass data/options, not Hook implementations.

## Defaults

- In React 19 function components, use optional props and parameter/destructuring defaults; function-component `defaultProps` is no longer supported.
- A separate defaults object may use `satisfies` to verify the intended props subset when repository type rules permit it.
- `static defaultProps` remains relevant to class components. `React.JSX.LibraryManagedAttributes` is an advanced library utility for exposing correctly optional consumer props; most applications do not need it.

## Events and forms

- Prefer inline event handlers when they remain readable; JSX contextual typing infers the exact event type.
- For extracted handlers, type either the event parameter (`React.ChangeEvent<HTMLInputElement>`) or the handler (`React.ChangeEventHandler<HTMLInputElement>`).
- Use the most specific event and element types. `React.SyntheticEvent` is a broad fallback when event-specific fields are unnecessary.
- With React type versions that deprecate `FormEvent`/`FormEventHandler`, use `SubmitEvent`/`SubmitEventHandler` for submit behavior.
- Read values from `currentTarget` when that is the typed element handling the event. If uncontrolled forms require named fields, prove the target shape narrowly or use browser form APIs rather than a broad assertion.
- For substantial forms, consider the project's established typed form solution; do not introduce a new form dependency without scope and evidence.

## Context

- Create context with an explicit value type.
- When a meaningful default exists, provide it.
- When no meaningful default exists, use `T | null`, then expose a custom consumer Hook that checks for null and throws a clear provider-missing error. Prefer this over `!`, `null!`, or `{ } as T`.
- React 19 can render `<ThemeContext value={value}>`; `<ThemeContext.Provider>` is the legacy-equivalent spelling.
- `useContext(Context)` remains valid. React 19 `use(Context)` can also read context and unwrap promises; unlike conventional Hooks, `use` may appear in conditions and loops.
- Keep provider values referentially stable when identity would otherwise trigger unnecessary consumers, while avoiding speculative memoization.

## Class and derived-state maintenance

- Prefer function components for new application code. Error boundaries remain a common class-based exception unless using a boundary library.
- When maintaining classes, type them as `React.Component<Props, State>` and type class state precisely.
- Avoid derived state unless the behavior cannot be represented by render-time derivation, memoization, a key, or controlled state. If `getDerivedStateFromProps` is unavoidable, type its return as `Partial<State> | null` and preserve a clear comparison invariant.

## Portals and error boundaries

- Type portal children as `React.ReactNode` and ensure the target DOM element exists before calling `createPortal`; do not hide a missing root with an unsafe assertion.
- Prefer an established typed error-boundary package when available. A custom React error boundary uses a class with `getDerivedStateFromError` and `componentDidCatch`; ordinary function components do not implement that boundary API.

## Suspense and concurrent APIs

- Give `Suspense` a meaningful `ReactNode` fallback at an intentional loading boundary.
- `use(promise)` suspends to the nearest Suspense boundary. Create/cache promises outside the consuming component or through a framework/cache layer; do not create a new promise on every render.
- `useTransition` returns pending state plus a transition starter; React 19 permits async transition callbacks. Use it for non-urgent updates, not to hide missing loading/error modeling.
- `useDeferredValue` defers a non-urgent view of a value and accepts an optional initial value in React 19.
- `startTransition` is the standalone form when a Hook is unavailable. Transitions are scheduling tools, not substitutes for effect cleanup or data consistency.

## Repository compatibility notes

Examples in the upstream cheatsheet sometimes use `any`, assertions, intersections, `Partial`, prop spreading, or older APIs to demonstrate TypeScript mechanics. They are not permission to violate stricter repository rules. In this repository, the `code-rules` skill remains authoritative for exact type shapes, forbidden utility types/assertions, JSX prop forwarding, module boundaries, and tests.

## Source

- https://github.com/typescript-cheatsheets/react
