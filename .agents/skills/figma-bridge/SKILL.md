---
name: figma-bridge
description: Figma tasks must use the local Figma Bridge for inspecting linked designs and nodes, matching UI to designs, discovering components, and exporting assets or manifests.
---

# Figma Bridge

Use `/Users/greenhost/develop/ai/figma-bridge/` as the interface to Figma. Read its `README.md` before operating it; the bridge implementation and README are the source of truth for setup and commands.

1. Check the bridge with `rtk node /Users/greenhost/develop/ai/figma-bridge/server/server.js status`. Continue when it reports `pluginConnected: true`.
2. If the server is unavailable, start it from `/Users/greenhost/develop/ai/figma-bridge/` with `rtk npm run serve` in a persistent terminal. If the plugin is disconnected, have the user open Figma Desktop and run **Local Figma Bridge**. Follow the bridge README when initial build or plugin installation is required.
3. Extract the `node-id` from the supplied Figma link. Both `4-10427` and `4:10427` forms are accepted.
4. Query the smallest relevant node with `inspect`; increase `--depth` only when required descendants are missing. Use `inventory` for component discovery, `export` for semantic component manifests, and `image` for rendered visual evidence or assets.
5. Base implementation details on bridge output. Use screenshots only as supporting visual evidence, not as a replacement for inspectable geometry, layout, styles, variables, properties, and text.

The Figma step is complete when every design node needed by the task has been inspected through the bridge and every required asset or manifest has been exported through it. Report bridge or plugin unavailability as a blocker rather than guessing design values.
