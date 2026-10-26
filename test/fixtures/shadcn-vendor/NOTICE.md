# Vendored shadcn sources (C3)

Registry sources copied verbatim. The only edits are the import specifiers listed per
file, because a consumer app resolves `pocketjs-react` by name and sibling components by
relative path. `bun tools/codemod/fetch-shadcn.ts` re-creates this tree;
`--verify` checks the hashes below offline.

- style: `new-york-v4`
- last fetched: 2026-10-26 (rows from earlier runs keep their own sources)
- registry: https://ui.shadcn.com/r/styles/new-york-v4/<name>.json

| file | bytes | sha256 | upstream | import remaps |
|---|---|---|---|---|
| `button.tsx` | 2394 | `dbe265a0c6c07471c6e9157492724aa355b4618f73c175cc97c7c51daa3fd5d6` | https://ui.shadcn.com/r/styles/new-york-v4/button.json | from "cn" -> "pocketjs-react" |
| `badge.tsx` | 1778 | `4f759008c5106765daa61ca91a9bcbfea871e4064fbc24aab57c0605e26ea90a` | https://ui.shadcn.com/r/styles/new-york-v4/badge.json | from "cn" -> "pocketjs-react" |
| `input.tsx` | 964 | `68af2a64cb50f7b6496742bcea4b0c07cadf6d52275bebef1c59bf0b02a50894` | https://ui.shadcn.com/r/styles/new-york-v4/input.json | from "cn" -> "pocketjs-react" |
| `card.tsx` | 1989 | `ed70a1fa17d1af760605bf4ef0747eb2acf59cca53bff5037626bc841640ae0a` | https://ui.shadcn.com/r/styles/new-york-v4/card.json | from "cn" -> "pocketjs-react" |
| `dialog.tsx` | 4296 | `7d5d98fa6e1aa3f90c66c37ea84c50710162759335a9e966e4db46f25062f17e` | https://ui.shadcn.com/r/styles/new-york-v4/dialog.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `dropdown-menu.tsx` | 8420 | `8bf2f7b1dc670a177c7703a2525e6ab3bf437049d711dd623bf2c52e3290bd3d` | https://ui.shadcn.com/r/styles/new-york-v4/dropdown-menu.json | from "cn" -> "pocketjs-react" |
| `select.tsx` | 6355 | `b58102899f666ebbb6dc0c41d3567fea22f5d1d29bbecd017a00432a0c8b0b62` | https://ui.shadcn.com/r/styles/new-york-v4/select.json | from "cn" -> "pocketjs-react" |
| `label.tsx` | 608 | `7ef40b042f517256fc83999b0ab7df71c335c240aaf64f0696c1977c2b2b6891` | https://ui.shadcn.com/r/styles/new-york-v4/label.json | from "cn" -> "pocketjs-react" |
| `separator.tsx` | 696 | `ebc33162afbb4a00efaca37248cddea538934128afbbe7d02b42a0617dd11b86` | https://ui.shadcn.com/r/styles/new-york-v4/separator.json | from "cn" -> "pocketjs-react" |
| `aspect-ratio.tsx` | 274 | `b1c157886236782cb92d8fbcd4749532aaf6d8aabefd6e157ca40358f902f407` | https://ui.shadcn.com/r/styles/new-york-v4/aspect-ratio.json | none |
| `progress.tsx` | 737 | `8f46347d2c0fb93d8ab23a57993b70e80f81801b55cf361e9e4a713e940a6128` | https://ui.shadcn.com/r/styles/new-york-v4/progress.json | from "cn" -> "pocketjs-react" |
| `avatar.tsx` | 2918 | `1a1845edf9d3f416ec3bde2eab845e266bb10cea50d4709ec043f5b1a6a91617` | https://ui.shadcn.com/r/styles/new-york-v4/avatar.json | from "cn" -> "pocketjs-react" |

The vendored files are data, not product code: `test/fixtures/shadcn-vendor/upstream/`
is only read by the codemod, and only its output (`../ui/`) is imported by the demo.
