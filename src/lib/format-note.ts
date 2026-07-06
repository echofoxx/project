export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string };

export type NoteBlock =
  | { type: "paragraph"; inline: InlineToken[] }
  | { type: "list"; items: InlineToken[][] };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "bold", value: match[1] });
    } else {
      tokens.push({ type: "italic", value: match[2] });
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

/**
 * Minimal, safe markdown-lite: **bold**, *italic*, and "- " bullet lists.
 * Deliberately not a full markdown parser (no HTML output, no injection
 * surface) - just enough formatting for task notes to read cleanly.
 */
export function parseNoteContent(content: string): NoteBlock[] {
  const lines = content.split("\n");
  const blocks: NoteBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: InlineToken[][] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", inline: parseInline(paragraphLines.join(" ")) });
      paragraphLines = [];
    }
  }
  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(parseInline(bulletMatch[1]));
    } else if (line === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks;
}
