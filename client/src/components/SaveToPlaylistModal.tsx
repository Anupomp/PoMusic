import { useState, useEffect } from 'react';
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Save to playlist</h2>
          <button className="delete-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {currentTrack && <p className="muted save-track">{currentTrack.title}</p>}
        {error && <div className="search-error">{error}</div>}
        {!playlists.length && <p className="muted">No playlists yet — create one in the Playlists tab first.</p>}
        <div className="save-list">
          {playlists.map((pl) => (
            <button key={pl.id} className="save-option" onClick={() => save(pl.id)}>
              {pl.name} {savedTo === pl.id ? '✓ Saved' : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
