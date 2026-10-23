# Vendored shadcn sources (C3)

Registry sources copied verbatim. The only edits are the import specifiers listed per
file, because a consumer app resolves `pocketjs-react` by name and sibling components by
relative path. `bun tools/codemod/fetch-shadcn.ts` re-creates this tree;
`--verify` checks the hashes below offline.

- style: `new-york-v4`
- fetched: 2026-10-23
- registry: https://ui.shadcn.com/r/styles/new-york-v4/<name>.json

| file | bytes | sha256 | upstream | import remaps |
|---|---|---|---|---|
| `button.tsx` | 2394 | `dbe265a0c6c07471c6e9157492724aa355b4618f73c175cc97c7c51daa3fd5d6` | https://ui.shadcn.com/r/styles/new-york-v4/button.json | from "cn" -> "pocketjs-react" |
| `badge.tsx` | 1778 | `4f759008c5106765daa61ca91a9bcbfea871e4064fbc24aab57c0605e26ea90a` | https://ui.shadcn.com/r/styles/new-york-v4/badge.json | from "cn" -> "pocketjs-react" |
| `input.tsx` | 964 | `68af2a64cb50f7b6496742bcea4b0c07cadf6d52275bebef1c59bf0b02a50894` | https://ui.shadcn.com/r/styles/new-york-v4/input.json | from "cn" -> "pocketjs-react" |
| `card.tsx` | 1989 | `ed70a1fa17d1af760605bf4ef0747eb2acf59cca53bff5037626bc841640ae0a` | https://ui.shadcn.com/r/styles/new-york-v4/card.json | from "cn" -> "pocketjs-react" |
| `dialog.tsx` | 4296 | `7d5d98fa6e1aa3f90c66c37ea84c50710162759335a9e966e4db46f25062f17e` | https://ui.shadcn.com/r/styles/new-york-v4/dialog.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |

The vendored files are data, not product code: `test/fixtures/shadcn-vendor/upstream/`
is only read by the codemod, and only its output (`../ui/`) is imported by the demo.
