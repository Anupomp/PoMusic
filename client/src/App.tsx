import { useState } from 'react';
import { useAuth } from './auth';
import { usePlayer } from './store';
import LoginPage from './components/LoginPage';
import SearchBar from './components/SearchBar';
import Queue from './components/Queue';
import Player from './components/Player';
import LyricsPanel from './components/LyricsPanel';
import PlaylistSidebar from './components/PlaylistSidebar';
import HistoryTab from './components/HistoryTab';
import ListenTogetherModal from './components/ListenTogetherModal';
import SaveToPlaylistModal from './components/SaveToPlaylistModal';

type Tab = 'queue' | 'playlists' | 'history';

export default function App() {
  const { email, logout } = useAuth();
  if (!email) return <LoginPage />;
  return <MainApp email={email} onLogout={logout} />;
}

function MainApp({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { room } = usePlayer();
  const [tab, setTab] = useState<Tab>('queue');
  const [showLyrics, setShowLyrics] = useState(true);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">Po<span>Music</span></h1>
        <SearchBar />
        <div className="topbar-actions">
          <button
            className={`room-btn ${room ? 'in-room' : ''}`}
            onClick={() => setShowRoomModal(true)}
          >
            {room ? `Room ${room.code}` : 'Listen together'}
          </button>
          <span className="user-email" title={email}>{email}</span>
          <button className="link-btn" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <div className="main">
        <section className="left">
          <nav className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'queue'} className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>Queue</button>
            <button role="tab" aria-selected={tab === 'playlists'} className={tab === 'playlists' ? 'active' : ''} onClick={() => setTab('playlists')}>Playlists</button>
            <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
            <button className={`lyrics-toggle ${showLyrics ? 'active' : ''}`} onClick={() => setShowLyrics((v) => !v)}>Lyrics</button>
          </nav>
          {tab === 'queue' && <Queue />}
          {tab === 'playlists' && <PlaylistSidebar />}
          {tab === 'history' && <HistoryTab />}
        </section>

        {showLyrics && (
          <aside className="right">
            <LyricsPanel />
          </aside>
        )}
      </div>

      <Player onSaveToPlaylist={() => setShowSaveModal(true)} />

      {showRoomModal && <ListenTogetherModal onClose={() => setShowRoomModal(false)} />}
      {showSaveModal && <SaveToPlaylistModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}
