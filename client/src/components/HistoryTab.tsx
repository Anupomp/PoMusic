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
      id: e.video_id,
      title: e.title,
      channel: '',
      duration: null,
      thumb: `https://i.ytimg.com/vi/${e.video_id}/mqdefault.jpg`,
    };
    addToQueue(track, true);
  }

  if (status === 'loading') return <p className="muted pl-empty">Loading history…</p>;
  if (status === 'error') return <p className="muted pl-empty">Could not load history.</p>;
  if (!entries.length) return <p className="muted pl-empty">Nothing played yet. Your recent songs will show up here.</p>;

  return (
    <div className="history">
      {entries.map((e) => (
        <div key={e.id} className="history-item" onClick={() => replay(e)}>
          <img src={`https://i.ytimg.com/vi/${e.video_id}/mqdefault.jpg`} alt="" className="track-thumb" loading="lazy" />
          <div className="track-info">
            <div className="track-title">{e.title}</div>
            <div className="track-channel">{new Date(e.played_at).toLocaleString()}</div>
          </div>
          <span className="history-play">▶</span>
        </div>
      ))}
    </div>
  );
}
