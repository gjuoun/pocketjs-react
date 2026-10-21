# pocketjs-react

React on [PocketJS](https://github.com/pocket-nexus/pocketjs): a UI framework base for
screens driven by a d-pad and a few buttons.

> Early exploration. Unofficial: not affiliated with or endorsed by Pocket Nexus.

## Idea

- Real `react` with a custom `react-reconciler` renderer that targets PocketJS's native tree
  (no DOM, no CSS engine, no WebView).
- Input is the d-pad and face buttons first. A focus manager, focus scopes and spatial
  navigation are part of the base. Pointer and touch come second.
- A small component set built for that input model (lists, tabs, menus, dialogs).

## Status

Nothing is built yet. The first step is a minimal slice: a d-pad-operable list and dialog
rendered by React on the PocketJS desktop and browser hosts, with measured first-render and
update times.

## License

MIT. See [LICENSE](./LICENSE).
