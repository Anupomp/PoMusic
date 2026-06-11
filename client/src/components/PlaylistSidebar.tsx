import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Playlist, PlaylistSong, Track } from '../types';
import { usePlayer } from '../store';

export default function PlaylistSidebar() {
  const { setQueue, playIndex } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    api<Playlist[]>('/api/playlists').then(setPlaylists).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  async function create() {
    const name = newName.trim();
    if (!name) return;
    try {
      await api('/api/playlists', { method: 'POST', body: JSON.stringify({ name }) });
      setNewName('');
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  async function open(id: number) {
    if (openId === id) { setOpenId(null); return; }
    const data = await api<{ songs: PlaylistSong[] }>(`/api/playlists/${id}`);
    setSongs(data.songs);
    setOpenId(id);
  }

  function toTrack(s: PlaylistSong): Track {
    return {
      id: s.video_id,
      title: s.title,
      channel: '',
      duration: s.duration_sec,
      thumb: s.thumbnail_url || `https://i.ytimg.com/vi/${s.video_id}/mqdefault.jpg`,
    };
  }

  function playAll() {
    if (!songs.length) return;
    setQueue(songs.map(toTrack));
    // setQueue is async via state; play first track on next tick
    setTimeout(() => playIndex(0), 0);
  }

  async function removeSong(songId: number) {
    if (openId == null) return;
    await api(`/api/playlists/${openId}/songs/${songId}`, { method: 'DELETE' });
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    refresh();
  }

  async function removePlaylist(id: number) {
    if (!confirm('Delete this playlist?')) return;
    await api(`/api/playlists/${id}`, { method: 'DELETE' });
    if (openId === id) setOpenId(null);
    refresh();
  }

  return (
    <div className="playlists">
      <div className="pl-create">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="New playlist name"
          aria-label="New playlist name"
        />
        <button onClick={create}>Create</button>
      </div>
      {error && <div className="search-error">{error}</div>}
      {!playlists.length && <p className="muted pl-empty">No playlists yet. Create one above, then save the current song to it from the player bar.</p>}
      {playlists.map((pl) => (
        <div key={pl.id} className="pl-item">
          <div className="pl-header" onClick={() => open(pl.id)}>
            <span className="pl-name">{pl.name}</span>
            <span className="pl-count">{pl.song_count} song{pl.song_count === 1 ? '' : 's'}</span>
            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); removePlaylist(pl.id); }} aria-label={`Delete ${pl.name}`}>✕</button>
          </div>
          {openId === pl.id && (
            <div className="pl-songs">
              {songs.length > 0 && <button className="pl-playall" onClick={playAll}>▶ Play all</button>}
              {!songs.length && <p className="muted">This playlist is empty.</p>}
              {songs.map((s) => (
                <div key={s.id} className="pl-song">
                  <span className="pl-song-title">{s.title}</span>
                  <button className="delete-btn" onClick={() => removeSong(s.id)} aria-label={`Remove ${s.title}`}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
