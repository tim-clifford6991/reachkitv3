// BUILD §4.7 — three switches, held on the user's own row, independently.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, newState, type FakeDbState } from "./fake-db";

const state: FakeDbState = newState();
vi.mock("@/lib/db", () => ({ db: () => fakeDbRef.current() }));
const fakeDbRef = { current: fakeDb(state) };

const { readNotifyPrefs, setNotifyPref, TOGGLABLE_KINDS } = await import(
  "../../../src/lib/mail/notifications/index"
);

beforeEach(() => {
  state.rows = { u1: { notify: {} } };
  state.reads = [];
  state.writes = [];
  state.failRead = false;
  state.failWrite = false;
});

describe("BUILD §4.7 — the notification toggles", () => {
  it("a customer who has never opened Settings has every mail on", async () => {
    await expect(readNotifyPrefs("u1")).resolves.toEqual({
      "draft-ready": true,
      published: true,
      weekly: true,
    });
  });

  it("a key absent from the row reads as on — never toggled is not switched off", async () => {
    state.rows = { u1: { notify: { weekly: false } } };
    await expect(readNotifyPrefs("u1")).resolves.toEqual({
      "draft-ready": true,
      published: true,
      weekly: false,
    });
  });

  it("setNotifyPref writes one key and leaves the other two exactly as they were", async () => {
    state.rows = { u1: { notify: { published: false } } };
    const after = await setNotifyPref({ userId: "u1", kind: "weekly", on: false });
    expect(after).toEqual({ "draft-ready": true, published: false, weekly: false });
    expect(state.writes).toEqual([{ id: "u1", notify: { published: false, weekly: false } }]);
  });

  it("the choice holds for a session with no client state — it is on the row, not in a browser", async () => {
    await setNotifyPref({ userId: "u1", kind: "draft-ready", on: false });
    // A second, independent read: nothing was cached in the module.
    await expect(readNotifyPrefs("u1")).resolves.toEqual({
      "draft-ready": false,
      published: true,
      weekly: true,
    });
  });

  it("turning a toggle back on writes the key and enqueues nothing", async () => {
    state.rows = { u1: { notify: { weekly: false } } };
    const after = await setNotifyPref({ userId: "u1", kind: "weekly", on: true });
    expect(after.weekly).toBe(true);
    // The guarantee that no missed mail is sent afterwards is the absence
    // of any queue: this module's whole write path is one row update.
    expect(state.writes).toHaveLength(1);
  });

  it("a read that failed is not silently answered 'all on'", async () => {
    state.failRead = true;
    await expect(readNotifyPrefs("u1")).rejects.toThrow(/could not read/);
  });

  it("a write that failed is not reported as a saved choice", async () => {
    state.failWrite = true;
    await expect(setNotifyPref({ userId: "u1", kind: "weekly", on: false })).rejects.toThrow(
      /could not write/
    );
  });

  it("reaches exactly three kinds", () => {
    expect([...TOGGLABLE_KINDS].sort()).toEqual(["draft-ready", "published", "weekly"]);
  });
});
