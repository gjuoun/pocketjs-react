# Vendored shadcn sources (C3)

Registry sources copied verbatim. The only edits are the import specifiers listed per
file, because a consumer app resolves `pocketjs-react` by name and sibling components
and hooks by relative path. `bun tools/codemod/fetch-shadcn.ts` re-creates this tree;
`--verify` checks the hashes below offline and lists any .ts/.tsx file with no row.

- style: `new-york-v4`
- fetched: 2026-10-26
- registry: https://ui.shadcn.com/r/styles/new-york-v4/<name>.json
- index: df2013e503ab31c06906a30722792f5ea703c63b4cff6a7d32d3717e6ab0f7be  https://ui.shadcn.com/r/index.json

| file | bytes | sha256 | upstream | import remaps |
|---|---|---|---|---|
| `accordion.tsx` | 2050 | `d15ae1ef0d6486c6fc383d64daad239d1efd2b950f326ed8f0c6948dac83372a` | https://ui.shadcn.com/r/styles/new-york-v4/accordion.json | from "cn" -> "pocketjs-react" |
| `alert-dialog.tsx` | 5432 | `edc135d001eefbf3fdddeecebf197945b60c8bfe6360d92f289444c016bde588` | https://ui.shadcn.com/r/styles/new-york-v4/alert-dialog.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `alert.tsx` | 1616 | `4aa14d5f5ae63d8e7c319d75cbdd8ad24309ee7b522587ca4ef4762790f3c438` | https://ui.shadcn.com/r/styles/new-york-v4/alert.json | from "cn" -> "pocketjs-react" |
| `aspect-ratio.tsx` | 274 | `b1c157886236782cb92d8fbcd4749532aaf6d8aabefd6e157ca40358f902f407` | https://ui.shadcn.com/r/styles/new-york-v4/aspect-ratio.json | none |
| `attachment.tsx` | 5995 | `21680811e72e0a2d79a3f154e6f5015f2ddb816bfb943c30877243f6a45e67a7` | https://ui.shadcn.com/r/styles/new-york-v4/attachment.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `avatar.tsx` | 2918 | `1a1845edf9d3f416ec3bde2eab845e266bb10cea50d4709ec043f5b1a6a91617` | https://ui.shadcn.com/r/styles/new-york-v4/avatar.json | from "cn" -> "pocketjs-react" |
| `badge.tsx` | 1778 | `4f759008c5106765daa61ca91a9bcbfea871e4064fbc24aab57c0605e26ea90a` | https://ui.shadcn.com/r/styles/new-york-v4/badge.json | from "cn" -> "pocketjs-react" |
| `breadcrumb.tsx` | 2352 | `9c736fdbeb9b6cea559fdbbefe605d5ac5d31517b5ba48b68c5475de26206739` | https://ui.shadcn.com/r/styles/new-york-v4/breadcrumb.json | from "cn" -> "pocketjs-react" |
| `bubble.tsx` | 4701 | `028a179ab2ef3a2957a36772e6c5683184d0eef58fb0e5a4f0ab74e99635d080` | https://ui.shadcn.com/r/styles/new-york-v4/bubble.json | from "cn" -> "pocketjs-react" |
| `button-group.tsx` | 2195 | `d6ea1dbe861ded5695b2c9e73ab0ea291c42bb1041dda7640b6e2d6a01fb6ec1` | https://ui.shadcn.com/r/styles/new-york-v4/button-group.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/separator" -> "./separator.tsx" |
| `button.tsx` | 2394 | `dbe265a0c6c07471c6e9157492724aa355b4618f73c175cc97c7c51daa3fd5d6` | https://ui.shadcn.com/r/styles/new-york-v4/button.json | from "cn" -> "pocketjs-react" |
| `calendar.tsx` | 7825 | `db9e2657887ee8b52c2e4cb0f4eb0539e2a321d13fb68183b17bec7557cf0491` | https://ui.shadcn.com/r/styles/new-york-v4/calendar.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `card.tsx` | 1989 | `ed70a1fa17d1af760605bf4ef0747eb2acf59cca53bff5037626bc841640ae0a` | https://ui.shadcn.com/r/styles/new-york-v4/card.json | from "cn" -> "pocketjs-react" |
| `carousel.tsx` | 5549 | `bf4723fb2e60194a9cdbfcd7d2b6cc3a996dae8e6632b134e8c8d62830c11f1e` | https://ui.shadcn.com/r/styles/new-york-v4/carousel.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `chart.tsx` | 10556 | `62d8f51e53737d7582bb91707932cae48696930d921dc724a546cca32235f93c` | https://ui.shadcn.com/r/styles/new-york-v4/chart.json | from "cn" -> "pocketjs-react" |
| `checkbox.tsx` | 1216 | `6d482ca1555f1b610f581a6886da7165d16526c17781cadc652a5462e5e149e8` | https://ui.shadcn.com/r/styles/new-york-v4/checkbox.json | from "cn" -> "pocketjs-react" |
| `collapsible.tsx` | 795 | `c6598e5584f4258b5d9fefadbc5ad6a66888ad58729f4b634a0bb2d9c513188b` | https://ui.shadcn.com/r/styles/new-york-v4/collapsible.json | none |
| `combobox.tsx` | 9141 | `701beab4040a32b360df33ba5b79c47578917c37d06a96af9472fa893c8f6051` | https://ui.shadcn.com/r/styles/new-york-v4/combobox.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx"<br>from "@/registry/new-york-v4/ui/input-group" -> "./input-group.tsx" |
| `command.tsx` | 4811 | `77311f512a7c77dcb1e49761d527bbe7622289e9a365994150e4384d9a2b58a7` | https://ui.shadcn.com/r/styles/new-york-v4/command.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/dialog" -> "./dialog.tsx" |
| `context-menu.tsx` | 8270 | `decdf38032ecd702c61738b502e0c0300938bf09f3b5dab583991ab149769e98` | https://ui.shadcn.com/r/styles/new-york-v4/context-menu.json | from "cn" -> "pocketjs-react" |
| `dialog.tsx` | 4296 | `7d5d98fa6e1aa3f90c66c37ea84c50710162759335a9e966e4db46f25062f17e` | https://ui.shadcn.com/r/styles/new-york-v4/dialog.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `direction.tsx` | 506 | `84ae2ad658207f0e0f367978e5508cd8027cd00c29c41d3d13db21a708c3d1e6` | https://ui.shadcn.com/r/styles/new-york-v4/direction.json | none |
| `drawer.tsx` | 4257 | `55b2dcfea96f4a74f2f8083e8ed76a2e32f2df5bddce4202739f7d1d47ac27b1` | https://ui.shadcn.com/r/styles/new-york-v4/drawer.json | from "cn" -> "pocketjs-react" |
| `dropdown-menu.tsx` | 8420 | `8bf2f7b1dc670a177c7703a2525e6ab3bf437049d711dd623bf2c52e3290bd3d` | https://ui.shadcn.com/r/styles/new-york-v4/dropdown-menu.json | from "cn" -> "pocketjs-react" |
| `empty.tsx` | 2398 | `924d407704c31fa80b51d24681ed840f909aaa1dfb305f181c548ce741b41202` | https://ui.shadcn.com/r/styles/new-york-v4/empty.json | from "cn" -> "pocketjs-react" |
| `field.tsx` | 6142 | `fb3d95337628dab1972f729835c921685273616126bed5ccf5540acb3da55880` | https://ui.shadcn.com/r/styles/new-york-v4/field.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/label" -> "./label.tsx"<br>from "@/registry/new-york-v4/ui/separator" -> "./separator.tsx" |
| `form.tsx` | 3750 | `2e24969ae2679de5c769458563102f59873bf7ef8c87be12882c8ae8332ac1be` | https://ui.shadcn.com/r/styles/new-york-v4/form.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/label" -> "./label.tsx" |
| `hover-card.tsx` | 1528 | `64919c70e425c630a9a13a0cfd380162b584b14f3f2c2c87a1e2d2c2135f703a` | https://ui.shadcn.com/r/styles/new-york-v4/hover-card.json | from "cn" -> "pocketjs-react" |
| `input-group.tsx` | 5038 | `80a8988544f74c3767a6df83c6fcd718f9b9c61ba73235228ac5595c5e836063` | https://ui.shadcn.com/r/styles/new-york-v4/input-group.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx"<br>from "@/registry/new-york-v4/ui/input" -> "./input.tsx"<br>from "@/registry/new-york-v4/ui/textarea" -> "./textarea.tsx" |
| `input-otp.tsx` | 2256 | `8485696ff26e8e3eb4283370ef65a3de7f1deb7ded336894de6c4a3d2d1bde08` | https://ui.shadcn.com/r/styles/new-york-v4/input-otp.json | from "cn" -> "pocketjs-react" |
| `input.tsx` | 964 | `68af2a64cb50f7b6496742bcea4b0c07cadf6d52275bebef1c59bf0b02a50894` | https://ui.shadcn.com/r/styles/new-york-v4/input.json | from "cn" -> "pocketjs-react" |
| `item.tsx` | 4479 | `323e707b746a7d5c8a3ded3dc4bd3f63a3f33129ddeaf8cb929a7959e2932d30` | https://ui.shadcn.com/r/styles/new-york-v4/item.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/separator" -> "./separator.tsx" |
| `kbd.tsx` | 865 | `6096634d129613f7fc9176f3d53177ddf22f093a9b085b2faa1ae58d3d599f05` | https://ui.shadcn.com/r/styles/new-york-v4/kbd.json | from "cn" -> "pocketjs-react" |
| `label.tsx` | 608 | `7ef40b042f517256fc83999b0ab7df71c335c240aaf64f0696c1977c2b2b6891` | https://ui.shadcn.com/r/styles/new-york-v4/label.json | from "cn" -> "pocketjs-react" |
| `marker.tsx` | 1866 | `53b3ccc5d973f11e179ca1c8066dad22e295e2eb9bf1aa8765cb55da0b19c424` | https://ui.shadcn.com/r/styles/new-york-v4/marker.json | from "cn" -> "pocketjs-react" |
| `menubar.tsx` | 8391 | `f0e7eeb2612eaf128c5aa899f6c407012c24374371120b48202bd1b30b42f653` | https://ui.shadcn.com/r/styles/new-york-v4/menubar.json | from "cn" -> "pocketjs-react" |
| `message-scroller.tsx` | 4015 | `4e7a1d05bf1c5773a89912bc7ee0a642a5cac68f2638b1f8fdb261970f5558ca` | https://ui.shadcn.com/r/styles/new-york-v4/message-scroller.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `message.tsx` | 2234 | `edfe15fe3ec104093707078fc500282207713809a2ce1c342af03c500e6f8c1d` | https://ui.shadcn.com/r/styles/new-york-v4/message.json | from "cn" -> "pocketjs-react" |
| `native-select.tsx` | 1997 | `6a104d4cd8f457905d106c53b95ff540b85426ac2231d4076e694cea73de18c8` | https://ui.shadcn.com/r/styles/new-york-v4/native-select.json | from "cn" -> "pocketjs-react" |
| `navigation-menu.tsx` | 6660 | `6bc9bde47e396cf14434b224a12172e84900f5d1955c3f5fd5ccd0af4ea149af` | https://ui.shadcn.com/r/styles/new-york-v4/navigation-menu.json | from "cn" -> "pocketjs-react" |
| `pagination.tsx` | 2710 | `72fb82df36f0c42980519cbc83c587d538bac3837c70bea93e4ba371be2fce63` | https://ui.shadcn.com/r/styles/new-york-v4/pagination.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx" |
| `popover.tsx` | 2359 | `858f41b58981e91efddcfd52662ce57462ecd89bfe90f1e51600b8d74f68c5af` | https://ui.shadcn.com/r/styles/new-york-v4/popover.json | from "cn" -> "pocketjs-react" |
| `progress.tsx` | 737 | `8f46347d2c0fb93d8ab23a57993b70e80f81801b55cf361e9e4a713e940a6128` | https://ui.shadcn.com/r/styles/new-york-v4/progress.json | from "cn" -> "pocketjs-react" |
| `radio-group.tsx` | 1462 | `faac9cc7daba95715012a87888ac80cda6723c60a2ba42af20dcfbb598b25c0f` | https://ui.shadcn.com/r/styles/new-york-v4/radio-group.json | from "cn" -> "pocketjs-react" |
| `resizable.tsx` | 1817 | `905e884c0e5e1cbf89daba82f04f801fbc1ccb9e38c4d9687744e2e278b14bbc` | https://ui.shadcn.com/r/styles/new-york-v4/resizable.json | from "cn" -> "pocketjs-react" |
| `scroll-area.tsx` | 1641 | `5e79edd1e2746b437bfc01921b5af2994057c96d370f9b055013e44d68048d76` | https://ui.shadcn.com/r/styles/new-york-v4/scroll-area.json | from "cn" -> "pocketjs-react" |
| `select.tsx` | 6355 | `b58102899f666ebbb6dc0c41d3567fea22f5d1d29bbecd017a00432a0c8b0b62` | https://ui.shadcn.com/r/styles/new-york-v4/select.json | from "cn" -> "pocketjs-react" |
| `separator.tsx` | 696 | `ebc33162afbb4a00efaca37248cddea538934128afbbe7d02b42a0617dd11b86` | https://ui.shadcn.com/r/styles/new-york-v4/separator.json | from "cn" -> "pocketjs-react" |
| `sheet.tsx` | 4190 | `15831f89ad8999fdaf559d00a5593b58b377023f5e2c03fff7e712c871c524d9` | https://ui.shadcn.com/r/styles/new-york-v4/sheet.json | from "cn" -> "pocketjs-react" |
| `sidebar.tsx` | 21581 | `df9fc4294f4b112d142d6fabbb8404af5723587e6774053914400ce698c60847` | https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/button" -> "./button.tsx"<br>from "@/registry/new-york-v4/ui/input" -> "./input.tsx"<br>from "@/registry/new-york-v4/ui/separator" -> "./separator.tsx"<br>from "@/registry/new-york-v4/ui/sheet" -> "./sheet.tsx"<br>from "@/registry/new-york-v4/ui/skeleton" -> "./skeleton.tsx"<br>from "@/registry/new-york-v4/ui/tooltip" -> "./tooltip.tsx"<br>from "@/registry/new-york-v4/hooks/use-mobile" -> "./use-mobile.ts" |
| `skeleton.tsx` | 279 | `7527fead4a562483ff32c74dee101d66744725ffdb469f98705907be68345455` | https://ui.shadcn.com/r/styles/new-york-v4/skeleton.json | from "cn" -> "pocketjs-react" |
| `slider.tsx` | 1993 | `709070e0102c3e7f4fd0b9d8086bd46fa59d79fc4e25c2c595f3de77a8ea8977` | https://ui.shadcn.com/r/styles/new-york-v4/slider.json | from "cn" -> "pocketjs-react" |
| `sonner.tsx` | 1034 | `13ccc9b0fe4248e622f83a1d3b2f0566b72b5e04162d7d0c8db8945ecc71b55f` | https://ui.shadcn.com/r/styles/new-york-v4/sonner.json | none |
| `spinner.tsx` | 333 | `b33797a80573e930586870d35140871295680fb13f6322c32db2c61e264ff371` | https://ui.shadcn.com/r/styles/new-york-v4/spinner.json | from "cn" -> "pocketjs-react" |
| `switch.tsx` | 1410 | `83f19a15b94c4725004feae009397e4ec95a257fb460a9cc1a17a14b085bc53a` | https://ui.shadcn.com/r/styles/new-york-v4/switch.json | from "cn" -> "pocketjs-react" |
| `table.tsx` | 2480 | `1a7b095b5e9e5a3d97d501f65a321e57ff2c4ea3516748ad3254b65edef36fd2` | https://ui.shadcn.com/r/styles/new-york-v4/table.json | from "cn" -> "pocketjs-react" |
| `tabs.tsx` | 3784 | `cfc1aaea5de77ced2e9d466dbec339ad933b12040cc0202e36f755f5fbf27d23` | https://ui.shadcn.com/r/styles/new-york-v4/tabs.json | from "cn" -> "pocketjs-react" |
| `textarea.tsx` | 761 | `1627d335cc51ceafd6a6bf9fa76df6d6b65b3158d99006530420704568606468` | https://ui.shadcn.com/r/styles/new-york-v4/textarea.json | from "cn" -> "pocketjs-react" |
| `toggle-group.tsx` | 2301 | `c3f87c5984f7ba76a6854d945ed72c76d6492547cbf7b0b8021d523659a2022e` | https://ui.shadcn.com/r/styles/new-york-v4/toggle-group.json | from "cn" -> "pocketjs-react"<br>from "@/registry/new-york-v4/ui/toggle" -> "./toggle.tsx" |
| `toggle.tsx` | 1567 | `6d0c5c0f3f34fc0c36b16edb47565f3acf7329de7d1c652e89770853eb4c8c37` | https://ui.shadcn.com/r/styles/new-york-v4/toggle.json | from "cn" -> "pocketjs-react" |
| `tooltip.tsx` | 1832 | `3b61b8181a3faa64d995d632d5788077ad53539632ae2e2d6b2ff23ef21fb314` | https://ui.shadcn.com/r/styles/new-york-v4/tooltip.json | from "cn" -> "pocketjs-react" |
| `use-mobile.ts` | 565 | `ad0936f84f1df79d3697bfbff9c18f8ad58431c1cbaf2359c6a853b0fcc9f28b` | https://ui.shadcn.com/r/styles/new-york-v4/use-mobile.json | none |

The vendored files are data, not product code: `test/fixtures/**/upstream/`
is only read by the codemod, and only its output (`../ui/`) is imported by the demo.

## Not published in new-york-v4

- `code-block` - HTTP 404 in new-york-v4 (not vendored; not pulled from another style)
- `questionnaire` - HTTP 404 in new-york-v4 (not vendored; not pulled from another style)
- `toast` - HTTP 404 in new-york-v4 (not vendored; not pulled from another style)
- `trace` - HTTP 404 in new-york-v4 (not vendored; not pulled from another style)
