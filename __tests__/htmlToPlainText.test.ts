import { htmlToPlainText } from "../lifeos-mobile/src/lib/helpers";

describe("htmlToPlainText", () => {
  it("leaves plain text alone", () => {
    expect(htmlToPlainText("Ticket ID:")).toBe("Ticket ID:");
  });

  it("converts web note HTML into readable plain text", () => {
    expect(htmlToPlainText("Ticket ID:<br>Person Spoken To:")).toBe(
      "Ticket ID:\nPerson Spoken To:",
    );
  });

  it("strips tags and entities", () => {
    expect(htmlToPlainText("<p>Hello&nbsp;<strong>world</strong></p>")).toBe("Hello world");
  });
});
