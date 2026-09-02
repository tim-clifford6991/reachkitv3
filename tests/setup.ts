// tests/setup.ts
//
// Global test setup: fails the run if a test process would make a real
// network call, so no test in this corpus can silently reach a vendor. A
// test that needs network-shaped behaviour mocks it explicitly (e.g.
// `vi.stubGlobal('fetch', vi.fn(...))`), which runs after this file and so
// overrides it for that test.
import http from "node:http";
import https from "node:https";

function refuse(via: string): never {
  throw new Error(
    `tests/setup.ts: a test attempted a real network call via ${via}. ` +
      "No test in this corpus may reach a vendor — mock the call explicitly."
  );
}

globalThis.fetch = (() => refuse("fetch()")) as unknown as typeof fetch;

for (const [mod, name] of [
  [http, "http"],
  [https, "https"],
] as const) {
  mod.request = (() => refuse(`${name}.request()`)) as unknown as typeof mod.request;
  mod.get = (() => refuse(`${name}.get()`)) as unknown as typeof mod.get;
}
