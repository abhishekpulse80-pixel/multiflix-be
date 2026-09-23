export type DeepLinkTarget =
  | { kind: 'profile'; value: string }
  | { kind: 'music'; value: string }
  | { kind: 'blog'; value: string }
  | { kind: 'video'; value: string };

export function targetFromUrl(url: string): DeepLinkTarget | null {
  const patterns: Array<[RegExp, DeepLinkTarget['kind']]> = [
    [/^multiflix:\/\/u\/([^/?#]+)(?:\/)?/i, 'profile'],
    [/^multiflix:\/\/m\/([^/?#]+)(?:\/)?/i, 'music'],
    [/^multiflix:\/\/b\/([^/?#]+)(?:\/)?/i, 'blog'],
    [/^multiflix:\/\/v\/([^/?#]+)(?:\/)?/i, 'video'],
    [/^https?:\/\/(?:www\.)?multiflix\.in\/u\/([^/?#]+)(?:\/)?/i, 'profile'],
    [/^https?:\/\/(?:www\.)?multiflix\.in\/m\/([^/?#]+)(?:\/)?/i, 'music'],
    [/^https?:\/\/(?:www\.)?multiflix\.in\/b\/([^/?#]+)(?:\/)?/i, 'blog'],
    [/^https?:\/\/(?:www\.)?multiflix\.in\/v\/([^/?#]+)(?:\/)?/i, 'video'],
  ];

  for (const [pattern, kind] of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return { kind, value: decodeURIComponent(match[1]) };
    }
  }

  return null;
}
