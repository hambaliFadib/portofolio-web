import { Fragment } from "react";
import { renderMarkedText } from "@/components/marked-text";
import { cn } from "@/lib/utils";

interface AssistantMessageContentProps {
  content: string;
  className?: string;
}

type MessageSegment =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "unordered-list";
      items: string[];
    }
  | {
      type: "ordered-list";
      items: string[];
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    };

const unorderedListPattern = /^[-*\u2022]\s+/;
const orderedListPattern = /^\d+[.)]\s+/;
const headingPattern = /^(#{1,3}\s+.+|[A-Z][A-Za-z0-9/&(),' -]{1,80}:)$/;
const inlinePattern =
  /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|https?:\/\/[^\s<>)]+|mailto:[^\s<>)]+)/g;
const tableSeparatorPattern = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;
const lineBreakPlaceholder = "\uE000";

function normalizeContent(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, lineBreakPlaceholder)
    .replace(/&nbsp;/gi, " ")
    .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, "$1")
    .trim();
}

function stripUnorderedMarker(line: string) {
  return line.replace(unorderedListPattern, "").trim();
}

function stripOrderedMarker(line: string) {
  return line.replace(orderedListPattern, "").trim();
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");

  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableRow(line: string) {
  return line.includes("|") && splitTableRow(line).length >= 2;
}

function parseMessageSegments(content: string): MessageSegment[] {
  const normalized = normalizeContent(content);

  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .flatMap((line) =>
      line.includes("|") ? [line] : line.split(lineBreakPlaceholder),
    );
  const segments: MessageSegment[] = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index]?.trim() ?? "";

    if (!currentLine) {
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";

    if (isTableRow(currentLine) && tableSeparatorPattern.test(nextLine)) {
      const headers = splitTableRow(currentLine);
      const rows: string[][] = [];

      index += 2;

      while (index < lines.length) {
        const tableLine = lines[index]?.trim() ?? "";

        if (!isTableRow(tableLine) || tableSeparatorPattern.test(tableLine)) {
          break;
        }

        rows.push(splitTableRow(tableLine));
        index += 1;
      }

      if (headers.length > 0 && rows.length > 0) {
        segments.push({ type: "table", headers, rows });
      }

      continue;
    }

    if (unorderedListPattern.test(currentLine)) {
      const items: string[] = [];

      while (index < lines.length) {
        const listLine = lines[index]?.trim() ?? "";

        if (!unorderedListPattern.test(listLine)) {
          break;
        }

        items.push(stripUnorderedMarker(listLine));
        index += 1;
      }

      segments.push({ type: "unordered-list", items });
      continue;
    }

    if (orderedListPattern.test(currentLine)) {
      const items: string[] = [];

      while (index < lines.length) {
        const listLine = lines[index]?.trim() ?? "";

        if (!orderedListPattern.test(listLine)) {
          break;
        }

        items.push(stripOrderedMarker(listLine));
        index += 1;
      }

      segments.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const paragraphLine = lines[index]?.trim() ?? "";

      if (!paragraphLine) {
        break;
      }

      if (unorderedListPattern.test(paragraphLine) || orderedListPattern.test(paragraphLine)) {
        break;
      }

      const followingLine = lines[index + 1]?.trim() ?? "";

      if (isTableRow(paragraphLine) && tableSeparatorPattern.test(followingLine)) {
        break;
      }

      paragraphLines.push(paragraphLine);
      index += 1;
    }

    segments.push({
      type: "paragraph",
      text: paragraphLines.join("\n").trim(),
    });
  }

  return segments;
}

function renderInlineText(text: string) {
  const normalizedText = text
    .replaceAll(lineBreakPlaceholder, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, "$1");

  return normalizedText.split("\n").map((line, lineIndex) => {
    const parts = line.split(inlinePattern);

    return (
      <Fragment key={`${lineIndex}-${line}`}>
        {lineIndex > 0 ? <br /> : null}
        {parts.map((part, partIndex) => {
          if (!part) {
            return null;
          }

          if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return (
              <strong key={`${partIndex}-${part}`} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </strong>
            );
          }

          if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
            return (
              <em key={`${partIndex}-${part}`} className="text-foreground/90">
                {part.slice(1, -1)}
              </em>
            );
          }

          if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
            return (
              <code
                key={`${partIndex}-${part}`}
                className="rounded border border-border/70 bg-secondary/60 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
              >
                {part.slice(1, -1)}
              </code>
            );
          }

          if (
            part.startsWith("http://") ||
            part.startsWith("https://") ||
            part.startsWith("mailto:")
          ) {
            return (
              <a
                key={`${partIndex}-${part}`}
                href={part}
                target={part.startsWith("mailto:") ? undefined : "_blank"}
                rel={part.startsWith("mailto:") ? undefined : "noreferrer"}
                className="break-all font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-primary/80"
              >
                {part}
              </a>
            );
          }

          return (
            <Fragment key={`${partIndex}-${part}`}>
              {renderMarkedText(part, `assistant-${lineIndex}-${partIndex}`)}
            </Fragment>
          );
        })}
      </Fragment>
    );
  });
}

function isHeadingParagraph(text: string) {
  return !text.includes("\n") && headingPattern.test(text);
}

function renderTableCell(headers: string[], row: string[], cellIndex: number) {
  const label = headers[cellIndex] ?? `Column ${cellIndex + 1}`;
  const value = row[cellIndex] ?? "";

  return (
    <div key={`${label}-${cellIndex}`} className={cellIndex > 0 ? "mt-3" : ""}>
      <div className="font-mono text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm leading-6 text-foreground/90">
        {renderInlineText(value)}
      </div>
    </div>
  );
}

export function AssistantMessageContent({
  content,
  className,
}: AssistantMessageContentProps) {
  const segments = parseMessageSegments(content);
  let orderedListStart = 1;

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "unordered-list") {
          return (
            <ul key={`unordered-${index}`} className="list-disc space-y-2 pl-5">
              {segment.items.map((item, itemIndex) => (
                <li key={`unordered-item-${itemIndex}`} className="pl-1 marker:text-primary/70">
                  {renderInlineText(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (segment.type === "ordered-list") {
          const start = orderedListStart;
          orderedListStart += segment.items.length;

          return (
            <ol key={`ordered-${index}`} start={start} className="list-decimal space-y-2 pl-5">
              {segment.items.map((item, itemIndex) => (
                <li key={`ordered-item-${itemIndex}`} className="pl-1 marker:text-primary/70">
                  {renderInlineText(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (segment.type === "table") {
          return (
            <div key={`table-${index}`} className="space-y-2">
              {segment.rows.map((row, rowIndex) => (
                <div
                  key={`table-row-${rowIndex}`}
                  className="rounded-md border border-border/70 bg-background/55 p-3"
                >
                  {segment.headers.map((_, cellIndex) =>
                    renderTableCell(segment.headers, row, cellIndex),
                  )}
                </div>
              ))}
            </div>
          );
        }

        return (
          <p
            key={`paragraph-${index}`}
            className={cn(
              "text-pretty",
              isHeadingParagraph(segment.text) ? "font-semibold text-foreground" : "",
            )}
          >
            {renderInlineText(segment.text.replace(/^#{1,3}\s+/, ""))}
          </p>
        );
      })}
    </div>
  );
}
