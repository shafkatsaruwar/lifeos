import { mergeSynapseCalendarEvents, parseSynapseDayPlan } from "../lib/synapseImport";

describe("synapseImport", () => {
  it("parses a day-plan payload and replaces prior synapse events", () => {
    const events = parseSynapseDayPlan(
      JSON.stringify({
        v: 1,
        events: [
          {
            id: "synapse-med-a-2026-08-08-0",
            title: "Med A",
            start: "2026-08-08T08:00",
            source: "Synapse",
            color: "#4b8bdc",
          },
        ],
      }),
    );
    expect(events).toHaveLength(1);
    const merged = mergeSynapseCalendarEvents(
      [
        { id: "lifeos-1", title: "Focus" },
        { id: "synapse-med-old", title: "Old" },
      ],
      events,
    );
    expect(merged.map((e) => e.id)).toEqual(["lifeos-1", "synapse-med-a-2026-08-08-0"]);
  });
});
