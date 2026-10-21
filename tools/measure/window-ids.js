ObjC.import("CoreGraphics");
ObjC.import("Foundation");
// JXA: print "windowNumber:layer:boundsJSON" for every window owned by one pid.
function run(argv) {
  const pid = parseInt(argv[0]);
  const list = ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionAll, 0));
  const out = [];
  for (let i = 0; i < list.count; i++) {
    const d = list.objectAtIndex(i);
    if (ObjC.unwrap(d.objectForKey("kCGWindowOwnerPID")) !== pid) continue;
    out.push(ObjC.unwrap(d.objectForKey("kCGWindowNumber")) + ":" + ObjC.unwrap(d.objectForKey("kCGWindowLayer")) + ":" + JSON.stringify(ObjC.deepUnwrap(d.objectForKey("kCGWindowBounds"))));
  }
  return out.join("\n");
}
