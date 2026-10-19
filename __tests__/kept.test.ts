import {
  boundLocationHistory,
  emptyKeptHub,
  executeKeptCommand,
  locationsIndex,
  matchKeptItems,
  mergeAiIntent,
  normalizeKeptHub,
  normalizeKeptItem,
  parseKeptUtterance,
  recentKept,
  resolveKeptIntent,
  retrievalSnippet,
  scoreKeptMatch,
  searchKept,
  validateKeptCommand,
  type KeptHub,
  type KeptItem,
} from "@/lib/kept";

const baseItem = (partial: Partial<KeptItem> & Pick<KeptItem, "id" | "name" | "location">): KeptItem => ({
  aliases: [],
  locationHistory: [],
  notes: "",
  privacy: "normal",
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  ...partial,
});

describe("kept normalize", () => {
  it("strips ownerId and bounds location history", () => {
    const raw = {
      id: "a1",
      name: "Keys",
      location: "Bowl",
      ownerId: "attacker",
      locationHistory: Array.from({ length: 30 }, (_, i) => ({
        location: `Place ${i}`,
        at: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      })),
    };
    const item = normalizeKeptItem(raw);
    expect(item).toBeTruthy();
    expect((item as KeptItem & { ownerId?: string }).ownerId).toBeUndefined();
    expect(item!.locationHistory.length).toBeLessThanOrEqual(20);
    expect(boundLocationHistory(item!.locationHistory).length).toBe(item!.locationHistory.length);
  });

  it("normalizes hub maps and arrays", () => {
    const hub = normalizeKeptHub({
      items: {
        x: baseItem({ id: "x", name: "Passport", location: "Safe" }),
      },
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    expect(hub.items).toHaveLength(1);
    expect(hub.items[0].name).toBe("Passport");
  });
});

describe("kept parse", () => {
  it("parses SAVE / FIND / UPDATE / LIST / FORGET", () => {
    expect(parseKeptUtterance("remember my keys in the kitchen drawer")).toEqual({
      kind: "SAVE",
      name: "keys",
      location: "kitchen drawer",
    });
    expect(parseKeptUtterance("where are my keys?")).toEqual({
      kind: "FIND",
      query: "keys",
    });
    expect(parseKeptUtterance("move passport to the blue suitcase")).toEqual({
      kind: "UPDATE",
      query: "passport",
      location: "blue suitcase",
    });
    expect(parseKeptUtterance("what's in the garage")).toEqual({
      kind: "LIST_BY_LOCATION",
      location: "garage",
    });
    expect(parseKeptUtterance("forget the umbrella")).toEqual({
      kind: "FORGET",
      query: "umbrella",
    });
  });

  it("marks private when asked", () => {
    expect(parseKeptUtterance("keep my journal in the nightstand private")).toMatchObject({
      kind: "SAVE",
      privacy: "private",
    });
  });
});

describe("kept match + retrieval", () => {
  const hub: KeptHub = {
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [
      baseItem({ id: "1", name: "House keys", location: "Kitchen bowl", aliases: ["keys"] }),
      baseItem({ id: "2", name: "Passport", location: "Safe", privacy: "private" }),
      baseItem({ id: "3", name: "Charger", location: "Desk drawer", forgottenAt: "2026-01-03T00:00:00.000Z" }),
    ],
  };

  it("scores aliases and excludes forgotten", () => {
    expect(scoreKeptMatch(hub.items[0], "keys")).toBeGreaterThan(0.8);
    const matches = matchKeptItems(hub, "keys");
    expect(matches.map((m) => m.item.id)).toEqual(["1"]);
  });

  it("hides private when includePrivate is false", () => {
    expect(matchKeptItems(hub, "passport", { includePrivate: false })).toHaveLength(0);
    expect(retrievalSnippet(hub, "passport", { includePrivate: false })).toHaveLength(0);
    expect(retrievalSnippet(hub, "passport", { includePrivate: true })[0]?.id).toBe("2");
  });

  it("does not send the whole collection to retrieval", () => {
    const big: KeptHub = {
      updatedAt: hub.updatedAt,
      items: Array.from({ length: 40 }, (_, i) =>
        baseItem({ id: `i${i}`, name: `Thing ${i}`, location: `Spot ${i}` }),
      ),
    };
    expect(retrievalSnippet(big, "Thing 7", { limit: 5 }).length).toBeLessThanOrEqual(5);
  });
});

describe("kept execute", () => {
  it("saves, finds, updates with history, lists, and forgets", () => {
    let hub = emptyKeptHub();
    const saved = executeKeptCommand(hub, {
      kind: "SAVE",
      name: "Keys",
      location: "Bowl by the door",
    }, { serverNow: "2026-04-01T12:00:00.000Z" });
    expect(saved.ok).toBe(true);
    hub = saved.hub;
    expect(hub.items[0].createdAt).toBe("2026-04-01T12:00:00.000Z");

    const found = executeKeptCommand(hub, { kind: "FIND", query: "keys" });
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.item?.location).toBe("Bowl by the door");

    const moved = executeKeptCommand(hub, {
      kind: "UPDATE",
      query: "keys",
      location: "Jacket pocket",
    }, { serverNow: "2026-04-02T12:00:00.000Z" });
    expect(moved.ok).toBe(true);
    hub = moved.hub;
    expect(hub.items[0].location).toBe("Jacket pocket");
    expect(hub.items[0].locationHistory[0]?.location).toBe("Bowl by the door");

    const withUmbrella = executeKeptCommand(hub, { kind: "SAVE", name: "Umbrella", location: "Jacket pocket" });
    expect(withUmbrella.ok).toBe(true);
    hub = withUmbrella.hub;
    const listed = executeKeptCommand(hub, { kind: "LIST_BY_LOCATION", location: "jacket" });
    expect(listed.ok).toBe(true);
    if (listed.ok) expect((listed.items || []).length).toBeGreaterThanOrEqual(1);

    const forgotten = executeKeptCommand(hub, { kind: "FORGET", query: "umbrella" });
    expect(forgotten.ok).toBe(true);
    expect(searchKept(forgotten.hub, "umbrella")).toHaveLength(0);
  });

  it("clarifies ambiguous updates", () => {
    const hub: KeptHub = {
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: [
        baseItem({ id: "a", name: "Black charger", location: "Bag" }),
        baseItem({ id: "b", name: "White charger", location: "Desk" }),
      ],
    };
    const result = executeKeptCommand(hub, { kind: "UPDATE", query: "charger", location: "Kitchen" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.clarify?.kind).toBe("CLARIFY");
  });

  it("uses serverNow for timestamps instead of client clocks", () => {
    const hub = emptyKeptHub();
    const result = executeKeptCommand(
      hub,
      { kind: "SAVE", name: "Laptop", location: "Office" },
      { serverNow: "2030-01-01T00:00:00.000Z" },
    );
    expect(result.hub.items[0].updatedAt).toBe("2030-01-01T00:00:00.000Z");
  });
});

describe("kept intents", () => {
  it("validates command schema and rejects junk", () => {
    expect(validateKeptCommand({ kind: "SAVE", name: "Keys", location: "Bowl" })).toEqual({
      kind: "SAVE",
      name: "Keys",
      location: "Bowl",
      notes: undefined,
      privacy: undefined,
    });
    expect(validateKeptCommand({ kind: "EXPLODE" })).toBeNull();
    expect(validateKeptCommand({ kind: "SAVE", name: "Keys" })).toBeNull();
  });

  it("resolves local intents and rejects fabricated AI locations", () => {
    const hub = emptyKeptHub();
    const local = resolveKeptIntent("remember glasses on the nightstand", hub);
    expect(local.command.kind).toBe("SAVE");

    const merged = mergeAiIntent("remember glasses", hub, {
      kind: "SAVE",
      name: "glasses",
      location: "Mars colony locker 9",
    });
    expect(merged.command.kind).toBe("CLARIFY");
  });
});

describe("kept browse helpers", () => {
  it("builds recent + location index without private when excluded", () => {
    const hub: KeptHub = {
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: [
        baseItem({ id: "1", name: "Keys", location: "Bowl", updatedAt: "2026-05-01T00:00:00.000Z" }),
        baseItem({ id: "2", name: "Diary", location: "Drawer", privacy: "private", updatedAt: "2026-06-01T00:00:00.000Z" }),
      ],
    };
    expect(recentKept(hub, 10, false).map((i) => i.id)).toEqual(["1"]);
    expect(locationsIndex(hub, false)).toEqual([{ location: "Bowl", count: 1 }]);
  });
});
