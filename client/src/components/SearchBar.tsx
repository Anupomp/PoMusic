import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
      if (PLAYLIST_RE.test(q)) {
        const tracks = await api<Track[]>(`/api/playlist?url=${encodeURIComponent(q)}`);
        setQueue([...queue, ...tracks]);
        setQuery(''); setOpen(false);
        return;
      }
      const idMatch = q.match(VIDEO_ID_RE);
      if (idMatch) {
        const meta = await api<Track>(`/api/meta?videoId=${idMatch[1]}`);
        addToQueue(meta, queue.length === 0);
        setQuery(''); setOpen(false);
        return;
      }
      const found = await api<Track[]>(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(found);
      setOpen(true);
      if (!found.length) setError('No results. Try different keywords.');
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
    <div className="relative flex-1 max-w-[560px]" ref={boxRef}>
      <div className="flex items-center gap-2 bg-paper border-2 border-ink shadow-brut-sm px-3 py-1.5">
        <span className="text-ink">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="SEARCH A SONG OR ARTIST…"
          aria-label="Search"
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-smoke placeholder:font-display placeholder:text-sm font-medium"
        />
        <button onClick={handleSubmit} disabled={busy} className="brut-btn-sm">
          {busy ? '…' : 'Go'}
        </button>
      </div>
      {error && <div className="mt-1.5 text-coral text-sm font-medium">{error}</div>}

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 bg-paper brut-border shadow-brut-lg max-h-[420px] overflow-y-auto z-50"
          >
            {results.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 border-b-2 border-ink last:border-b-0 hover:bg-cream">
                <img src={t.thumb} alt="" loading="lazy" className="w-16 h-9 object-cover border-2 border-ink" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-smoke">{t.channel} · {formatDuration(t.duration)}</div>
                </div>
                <button onClick={() => pick(t, true)} title="Play now" className="icon-square w-8 h-8 bg-lime">▶</button>
                <button onClick={() => pick(t, false)} title="Add to queue" className="icon-square w-8 h-8">＋</button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
