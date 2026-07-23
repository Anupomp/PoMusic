import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { api } from '../api';
import { Playlist } from '../types';
import { usePlayer } from '../store';

export default function SaveToPlaylistModal({ onClose }: { onClose: () => void }) {
  const { currentTrack } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [savedTo, setSavedTo] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Playlist[]>('/api/playlists').then(setPlaylists).catch((e) => setError(e.message));
  }, []);

  async function save(playlistId: number) {
    if (!currentTrack) return;
    try {
      await api(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        body: JSON.stringify({
          video_id: currentTrack.id,
          title: currentTrack.title,
          thumbnail_url: currentTrack.thumb,
          duration_sec: currentTrack.duration,
        }),
      });
      setSavedTo(playlistId);
      setTimeout(onClose, 800);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, rotate: 1.5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-paper brut-border shadow-brut-lg p-6 w-full max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-bold uppercase text-lg">Save to playlist</h2>
          <button className="icon-square w-7 h-7 hover:bg-coral hover:text-paper" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {currentTrack && <p className="text-smoke text-sm mb-3 truncate">{currentTrack.title}</p>}
        {error && <div className="bg-coral text-paper border-2 border-ink px-3 py-2 text-sm font-medium mb-3">{error}</div>}
        {!playlists.length && <p className="text-smoke text-sm">No playlists yet — create one in the Playlists tab first.</p>}
        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              className="text-left font-display font-bold uppercase border-2 border-ink bg-paper px-3 py-2.5 hover:bg-lime transition-colors"
              onClick={() => save(pl.id)}
            >
              {pl.name} {savedTo === pl.id ? '✓ Saved' : ''}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
