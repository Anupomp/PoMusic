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
      setNewName(''); refresh();
    } catch (e) { setError((e as Error).message); }
  }

  async function open(id: number) {
    if (openId === id) { setOpenId(null); return; }
    const data = await api<{ songs: PlaylistSong[] }>(`/api/playlists/${id}`);
    setSongs(data.songs); setOpenId(id);
  }

  function toTrack(s: PlaylistSong): Track {
    return {
      id: s.video_id, title: s.title, channel: '',
      duration: s.duration_sec,
      thumb: s.thumbnail_url || `https://i.ytimg.com/vi/${s.video_id}/mqdefault.jpg`,
    };
  }

  function playAll() {
    if (!songs.length) return;
    setQueue(songs.map(toTrack));
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
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="NEW PLAYLIST NAME"
          className="brut-input flex-1 placeholder:font-display placeholder:text-sm"
        />
        <button onClick={create} className="brut-btn">Create</button>
      </div>
      {error && <div className="text-coral text-sm font-medium mb-2">{error}</div>}
      {!playlists.length && (
        <p className="text-smoke text-sm text-center py-8 border-2 border-dashed border-ink">
          No playlists yet. Create one above, then save songs from the player bar.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {playlists.map((pl) => (
          <div key={pl.id} className="border-2 border-ink bg-paper">
            <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-cream" onClick={() => open(pl.id)}>
              <span className="font-display font-bold uppercase flex-1 truncate">{pl.name}</span>
              <span className="text-xs text-smoke">{pl.song_count} song{pl.song_count === 1 ? '' : 's'}</span>
              <button className="icon-square w-7 h-7 hover:bg-coral hover:text-paper" onClick={(e) => { e.stopPropagation(); removePlaylist(pl.id); }} aria-label={`Delete ${pl.name}`}>✕</button>
            </div>
            {openId === pl.id && (
              <div className="border-t-2 border-ink px-3 py-2.5">
                {songs.length > 0 && <button className="brut-btn-sm mb-2" onClick={playAll}>▶ Play all</button>}
                {!songs.length && <p className="text-smoke text-sm">Empty playlist.</p>}
                {songs.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 text-sm truncate">{s.title}</span>
                    <button className="icon-square w-6 h-6 hover:bg-coral hover:text-paper" onClick={() => removeSong(s.id)} aria-label={`Remove ${s.title}`}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
