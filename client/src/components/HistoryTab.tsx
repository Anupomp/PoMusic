import { useState, useEffect } from 'react';
import { api } from '../api';
import { HistoryEntry, Track } from '../types';
import { usePlayer } from '../store';

export default function HistoryTab() {
  const { addToQueue } = usePlayer();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    api<HistoryEntry[]>('/api/history?limit=50')
      .then((rows) => { setEntries(rows); setStatus('done'); })
      .catch(() => setStatus('error'));
  }, []);

  function replay(e: HistoryEntry) {
    const track: Track = {
      id: e.video_id, title: e.title, channel: '', duration: null,
      thumb: `https://i.ytimg.com/vi/${e.video_id}/mqdefault.jpg`,
    };
    addToQueue(track, true);
  }

  const empty = 'text-smoke text-sm text-center py-8 border-2 border-dashed border-ink';
  if (status === 'loading') return <p className={empty}>Loading history…</p>;
  if (status === 'error') return <p className={empty}>Could not load history.</p>;
  if (!entries.length) return <p className={empty}>Nothing played yet. Recent songs show up here.</p>;

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-3 border-2 border-ink bg-paper px-3 py-2.5 cursor-pointer hover:bg-cream" onClick={() => replay(e)}>
          <img src={`https://i.ytimg.com/vi/${e.video_id}/mqdefault.jpg`} alt="" className="w-[72px] h-10 object-cover border-2 border-ink" loading="lazy" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{e.title}</div>
            <div className="text-xs text-smoke">{new Date(e.played_at).toLocaleString()}</div>
          </div>
          <span className="icon-square w-7 h-7 bg-lime">▶</span>
        </div>
      ))}
    </div>
  );
}
