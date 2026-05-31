import { Fragment, type ReactNode } from "react";

const markerPattern = /\/([^/\n]+?)\//g;

export function stripInlineMarkers(text: string) {
  return text.replace(markerPattern, (_, term: string) => term.trim());
}

export function renderMarkedText(text: string, keyPrefix = "marked"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  markerPattern.lastIndex = 0;

  while ((match = markerPattern.exec(text)) !== null) {
    const [raw, term] = match;

    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
    }

    nodes.push(
      <span
        key={`${keyPrefix}-term-${match.index}`}
        className="font-medium italic text-current"
      >
        {term.trim()}
      </span>,
    );

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-text-${lastIndex}`}>
        {text.slice(lastIndex)}
      </Fragment>,
    );
  }

  return nodes.length > 0 ? nodes : [text];
}

export function MarkedText({ text }: { text: string }) {
  return <>{renderMarkedText(text)}</>;
}
