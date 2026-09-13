/**
 * Splits a string into a list of `text` and `hashtag` tokens. A hashtag is
 * `#` followed by one or more word characters (letters/digits/underscore).
 * Used by the chat/feed UI to render `#travel` as a tappable link.
 */

export type HashtagToken =
  | { type: 'text'; value: string }
  | { type: 'hashtag'; value: string; tag: string };

/** Matches `#word` (letters/digits/underscore, at least one char). */
const HASHTAG_RE = /#([A-Za-z0-9_]+)/g;

export function parseHashtags(input: string | null | undefined): HashtagToken[] {
  const text = input ?? '';
  if (text.length === 0) {
    return [];
  }

  const tokens: HashtagToken[] = [];
  let lastIndex = 0;

  HASHTAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = HASHTAG_RE.exec(text)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    tokens.push({
      type: 'hashtag',
      value: match[0],
      tag: match[1],
    });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}
