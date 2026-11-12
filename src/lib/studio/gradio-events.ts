import { createParser, type EventSourceMessage } from "eventsource-parser";

// Gradio streams use Server-Sent Events. The parser handles CRLF, comments,
// and multi-line data without relying on a particular line ending.
export function gradioEvents(raw: string): EventSourceMessage[] {
  const events: EventSourceMessage[] = [];
  const parser = createParser({ onEvent: (event) => events.push(event) });
  parser.feed(raw);
  return events;
}
