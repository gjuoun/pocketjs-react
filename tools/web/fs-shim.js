// A globalThis.fs for the browser host page, in the shapes of PocketJS's fs module spec
// (contracts/spec/fs.ts), so the guest's unchanged @pocketjs/framework/fs SDK works on it.
// The stock browser host mounts no fs namespace; this lives in the host page, not in PocketJS.
//   books/<name>  files the user picked with the page's file input (read-only, in memory)
//   anything else writable, persisted in localStorage (reading position, settings)
const PREFIX = "pocketjs-react:fs:";

function toBase64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}
const byCodePoint = (a, b) => {
  const x = [...a], y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d) return d;
  }
  return x.length - y.length;
};

export function createBrowserFs(storage = globalThis.localStorage) {
  const picked = new Map(); // "books/<name>" -> Uint8Array
  let lastError = "";
  const fail = (message) => { lastError = message; return 1; };
  const failJson = (message) => { lastError = message; return JSON.stringify({ error: message }); };
  const readOnly = (path) => path === "books" || path.startsWith("books/");
  const stored = (path) => {
    const v = storage.getItem(PREFIX + path);
    return v === null ? undefined : fromBase64(v);
  };
  const fileAt = (path) => picked.get(path) ?? (readOnly(path) ? undefined : stored(path));
  const allFiles = () => {
    const out = new Map(picked);
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(PREFIX)) out.set(key.slice(PREFIX.length), fromBase64(storage.getItem(key)));
    }
    return out;
  };
  const decode = (data) => {
    const value = JSON.parse(data);
    if (typeof value === "string") return new TextEncoder().encode(value);
    return fromBase64(value.$b);
  };
  const ns = {
    read(path, offset, maxBytes) {
      const file = fileAt(path);
      if (!file) return failJson("not found");
      lastError = "";
      const chunk = file.subarray(offset, offset + maxBytes);
      return JSON.stringify({ data: { $b: toBase64(chunk) }, size: file.length, eof: offset + chunk.length >= file.length });
    },
    write(path, data, mode) {
      if (readOnly(path)) return fail("read-only: books/ holds the files you picked");
      const bytes = decode(data);
      const prev = mode === 1 ? stored(path) ?? new Uint8Array(0) : new Uint8Array(0);
      const next = new Uint8Array(prev.length + bytes.length);
      next.set(prev);
      next.set(bytes, prev.length);
      storage.setItem(PREFIX + path, toBase64(next));
      lastError = "";
      return 0;
    },
    remove(path) {
      if (readOnly(path)) return fail("read-only");
      if (storage.getItem(PREFIX + path) === null) return fail("not found");
      storage.removeItem(PREFIX + path);
      lastError = "";
      return 0;
    },
    list(path) {
      const prefix = path ? path + "/" : "";
      const entries = new Map();
      for (const [name, bytes] of allFiles()) {
        if (!name.startsWith(prefix)) continue;
        const rest = name.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash < 0) entries.set(rest, { name: rest, kind: "file", size: bytes.length });
        else entries.set(rest.slice(0, slash), { name: rest.slice(0, slash), kind: "dir", size: 0 });
      }
      if (entries.size === 0 && path && path !== "books") return failJson("not found");
      lastError = "";
      return JSON.stringify({ entries: [...entries.values()].sort((a, b) => byCodePoint(a.name, b.name)), eof: true });
    },
    stat(path) {
      if (path === "" || path === "books") return JSON.stringify({ kind: "dir", size: 0 });
      const file = fileAt(path);
      if (file) return JSON.stringify({ kind: "file", size: file.length });
      for (const name of allFiles().keys()) if (name.startsWith(path + "/")) return JSON.stringify({ kind: "dir", size: 0 });
      return failJson("not found");
    },
    mkdir() { lastError = ""; return 0; },
    rename(from, to) {
      if (readOnly(from) || readOnly(to)) return fail("read-only");
      const v = storage.getItem(PREFIX + from);
      if (v === null) return fail("not found");
      storage.setItem(PREFIX + to, v);
      storage.removeItem(PREFIX + from);
      lastError = "";
      return 0;
    },
    usage() {
      let used = 0;
      for (const bytes of allFiles().values()) used += bytes.length;
      return JSON.stringify({ usedBytes: used, quotaBytes: 0 });
    },
    lastError() { return lastError; },
  };
  return {
    ns,
    /** Add files from an <input type=file> FileList. */
    async addFiles(files) {
      for (const file of files) picked.set("books/" + file.name, new Uint8Array(await file.arrayBuffer()));
    },
    pickedNames: () => [...picked.keys()].map((k) => k.slice("books/".length)),
  };
}
