export interface LyricsResult {
  lyrics: string | null;
  synced: string | null;
  source: string;
}

const HEADERS = {
  'User-Agent': 'PoMusic/2.0 (https://github.com/Anupomp/Music-Player)',
  Accept: 'application/json',
};

/** Fetch lyrics from lrclib.net — exact match first, then search. Ported from v1. */
export async function getLyrics(artist: string, track: string): Promise<LyricsResult | null> {
  const exactUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
  let res = await fetch(exactUrl, { headers: HEADERS });

  if (res.ok) {
    const data = (await res.json()) as { plainLyrics?: string; syncedLyrics?: string };
    return { lyrics: data.plainLyrics || null, synced: data.syncedLyrics || null, source: 'lrclib.net' };
  }

  const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
  res = await fetch(searchUrl, { headers: HEADERS });
  if (!res.ok) return null;

  const items = (await res.json()) as Array<{ plainLyrics?: string; syncedLyrics?: string }>;
  if (!Array.isArray(items) || !items.length) return null;

  const item = items.find((i) => i.plainLyrics || i.syncedLyrics) || items[0];
  return { lyrics: item.plainLyrics || null, synced: item.syncedLyrics || null, source: 'lrclib.net' };
}
