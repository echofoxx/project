import { describe, expect, it } from "vitest";
import { parseNoteContent } from "@/lib/format-note";

describe("parseNoteContent", () => {
  it("parses plain text as a single paragraph", () => {
    expect(parseNoteContent("hello world")).toEqual([
      { type: "paragraph", inline: [{ type: "text", value: "hello world" }] },
    ]);
  });

  it("parses bold and italic inline tokens", () => {
    expect(parseNoteContent("a **bold** and *italic* word")).toEqual([
      {
        type: "paragraph",
        inline: [
          { type: "text", value: "a " },
          { type: "bold", value: "bold" },
          { type: "text", value: " and " },
          { type: "italic", value: "italic" },
          { type: "text", value: " word" },
        ],
      },
    ]);
  });

  it("groups consecutive bullet lines into a list block", () => {
    const blocks = parseNoteContent("- first\n- second");
    expect(blocks).toEqual([
      {
        type: "list",
        items: [
          [{ type: "text", value: "first" }],
          [{ type: "text", value: "second" }],
        ],
      },
    ]);
  });

  it("separates a paragraph, a list, and another paragraph on blank lines", () => {
    const blocks = parseNoteContent("intro\n\n- one\n- two\n\noutro");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "paragraph"]);
  });

  it("never produces raw HTML - just typed tokens", () => {
    const blocks = parseNoteContent("<script>alert(1)</script>");
    expect(blocks).toEqual([
      { type: "paragraph", inline: [{ type: "text", value: "<script>alert(1)</script>" }] },
    ]);
  });
});
