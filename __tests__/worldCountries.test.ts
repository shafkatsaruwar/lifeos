import { findWorldCountry, searchWorldCountries } from "@/lib/worldCountries";

describe("worldCountries", () => {
  it("resolves common aliases to a canonical country", () => {
    expect(findWorldCountry("UK")?.name).toBe("United Kingdom");
    expect(findWorldCountry("deutschland")?.code).toBe("DE");
    expect(findWorldCountry("holland")?.name).toBe("Netherlands");
  });

  it("ranks prefix matches for the picker", () => {
    const results = searchWorldCountries("Ger", 5);
    expect(results[0]?.name).toBe("Germany");
  });
});
