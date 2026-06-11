import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import { usePlayer } from '../store';

interface LyricLine { t: number; text: string; }

function parseSynced(synced: string): LyricLine[] {
  return synced
    .split('\n')
    .map((line) => {
      const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
      if (!m) return null;
      return { t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: m[3].trim() };
    })
    .filter((x): x is LyricLine => x !== null && x.text.length > 0);
}

/** Guess artist/track from a YouTube title like "Artist - Track (Official Video)". */
function splitTitle(title: string, channel: string): { artist: string; track: string } {
  const clean = title.replace(/[\(\[][^)\]]*[\)\]]/g, '').trim();
  const parts = clean.split(/\s[-–—|]\s/);
  if (parts.length >= 2) return { artist: parts[0].trim(), track: parts.slice(1).join(' ').trim() };
  return { artist: channel.replace(/ - Topic$/, '').replace(/VEVO$/i, '').trim(), track: clean };
}

export default function LyricsPanel() {
  const { currentTrack, audioRef } = usePlayer();
  const [plain, setPlain] = useState<string | null>(null);
  const [synced, setSynced] = useState<LyricLine[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'none'>('idle');
  const [activeLine, setActiveLine] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlain(null); setSynced(null); setActiveLine(-1);
    if (!currentTrack) { setStatus('idle'); return; }
    const { artist, track } = splitTitle(currentTrack.title, currentTrack.channel);
    setStatus('loading');
    api<{ lyrics: string | null; synced: string | null }>(
      `/api/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
    )
      .then((res) => {
        if (res.synced) setSynced(parseSynced(res.synced));
        if (res.lyrics) setPlain(res.lyrics);
        setStatus(res.synced || res.lyrics ? 'idle' : 'none');
      })
      .catch(() => setStatus('none'));
  }, [currentTrack]);

  // Track active synced line
  useEffect(() => {
    if (!synced?.length) return;
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const t = audio.currentTime;
      let idx = -1;
      for (let i = 0; i < synced.length; i++) {
        if (synced[i].t <= t) idx = i;
        else break;
      }
      setActiveLine(idx);
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [synced, audioRef]);

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLine < 0 || !listRef.current) return;
    const el = listRef.current.children[activeLine] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLine]);

  const plainLines = useMemo(() => plain?.split('\n') ?? [], [plain]);

  if (!currentTrack) return <div className="lyrics-panel muted">Play a song to see lyrics.</div>;
  if (status === 'loading') return <div className="lyrics-panel muted">Finding lyrics…</div>;
  if (status === 'none') return <div className="lyrics-panel muted">No lyrics found for this track.</div>;

  return (
    <div className="lyrics-panel" ref={listRef}>
      {synced?.length
        ? synced.map((line, i) => (
            <p key={i} className={`lyric-line ${i === activeLine ? 'active' : ''}`}>{line.text}</p>
          ))
        : plainLines.map((line, i) => <p key={i} className="lyric-line">{line || '\u00A0'}</p>)}
    </div>
  );
}
