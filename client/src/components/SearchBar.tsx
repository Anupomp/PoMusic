import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { Track, formatDuration } from '../types';
import { usePlayer } from '../store';

const VIDEO_ID_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const PLAYLIST_RE = /[?&]list=/;

export default function SearchBar() {
  const { addToQueue, setQueue, queue } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  async function handleSubmit() {
    const q = query.trim();
    if (!q || busy) return;
    setError('');
    setBusy(true);
    try {
      // URLs still work — playlist, radio/mix, or single video
      if (PLAYLIST_RE.test(q)) {
        const tracks = await api<Track[]>(`/api/playlist?url=${encodeURIComponent(q)}`);
        setQueue([...queue, ...tracks]);
        setQuery('');
        setOpen(false);
        return;
      }
      const idMatch = q.match(VIDEO_ID_RE);
      if (idMatch) {
        const meta = await api<Track>(`/api/meta?videoId=${idMatch[1]}`);
        addToQueue(meta, queue.length === 0);
        setQuery('');
        setOpen(false);
        return;
      }
      // Plain text — real search, no link needed
      const found = await api<Track[]>(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(found);
      setOpen(true);
      if (!found.length) setError('No results found. Try different keywords.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function pick(track: Track, playNow: boolean) {
    addToQueue(track, playNow);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="search-wrap" ref={boxRef}>
      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Search for a song or artist…"
          aria-label="Search"
        />
        <button onClick={handleSubmit} disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>
      {error && <div className="search-error">{error}</div>}
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((t) => (
            <div key={t.id} className="search-result">
              <img src={t.thumb} alt="" loading="lazy" />
              <div className="sr-info">
                <div className="sr-title">{t.title}</div>
                <div className="sr-channel">{t.channel} · {formatDuration(t.duration)}</div>
              </div>
              <div className="sr-actions">
                <button onClick={() => pick(t, true)} title="Play now">▶</button>
                <button onClick={() => pick(t, false)} title="Add to queue">＋</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
