import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

  const tabBtn = (t: Tab, label: string) => (
    <button
      role="tab" aria-selected={tab === t}
      className={`font-display font-bold uppercase px-4 py-2 border-2 border-ink transition-all ${
        tab === t ? 'bg-lime shadow-brut-sm' : 'bg-paper hover:bg-cream'
      }`}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-cream">
      <header className="flex items-center gap-5 px-6 py-3 bg-paper border-b-[3px] border-ink">
        <h1 className="font-display font-bold text-2xl uppercase tracking-tighter whitespace-nowrap">
          Po<span className="bg-lime px-1">Music</span>
        </h1>
        <SearchBar />
        <div className="flex items-center gap-3 ml-auto">
          <button
            className={`font-display font-bold uppercase text-sm border-2 border-ink px-3 py-1.5 transition-all ${
              room ? 'bg-coral text-paper' : 'bg-paper hover:bg-lime'
            }`}
            onClick={() => setShowRoomModal(true)}
          >
            {room ? `Room ${room.code}` : 'Listen together'}
          </button>
          <span className="text-smoke text-xs max-w-[160px] truncate hidden lg:block" title={email}>{email}</span>
          <button className="text-sm font-medium underline underline-offset-2 hover:text-coral" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-[1.4] flex flex-col overflow-y-auto p-5">
          <nav className="flex gap-2 mb-4" role="tablist">
            {tabBtn('queue', 'Queue')}
            {tabBtn('playlists', 'Playlists')}
            {tabBtn('history', 'History')}
            <button
              className={`font-display font-bold uppercase px-4 py-2 border-2 border-ink ml-auto transition-all ${
                showLyrics ? 'bg-lime shadow-brut-sm' : 'bg-paper hover:bg-cream'
              }`}
              onClick={() => setShowLyrics((v) => !v)}
            >
              Lyrics
            </button>
          </nav>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'queue' && <Queue />}
              {tab === 'playlists' && <PlaylistSidebar />}
              {tab === 'history' && <HistoryTab />}
            </motion.div>
          </AnimatePresence>
        </section>

        {showLyrics && (
          <aside className="flex-1 border-l-[3px] border-ink bg-paper overflow-hidden hidden md:block">
            <LyricsPanel />
          </aside>
        )}
      </div>

      <Player onSaveToPlaylist={() => setShowSaveModal(true)} />

      <AnimatePresence>
        {showRoomModal && <ListenTogetherModal onClose={() => setShowRoomModal(false)} />}
        {showSaveModal && <SaveToPlaylistModal onClose={() => setShowSaveModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
