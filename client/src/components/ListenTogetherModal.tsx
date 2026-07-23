import { useState } from 'react';
import { motion } from 'motion/react';
import { usePlayer } from '../store';

export default function ListenTogetherModal({ onClose }: { onClose: () => void }) {
  const { createRoom, joinRoom, leaveRoom, room } = usePlayer();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setBusy(true); setError('');
    try { await createRoom(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleJoin() {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) { setError('Room codes are 6 characters.'); return; }
    setBusy(true); setError('');
    try { await joinRoom(c); onClose(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function copyCode() {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, rotate: -1.5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-paper brut-border shadow-brut-lg p-6 w-full max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-bold uppercase text-lg">Listen together</h2>
          <button className="icon-square w-7 h-7 hover:bg-coral hover:text-paper" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {room ? (
          <div className="text-center">
            <p className="text-smoke text-sm mb-1">{room.isHost ? 'You are hosting. Share this code:' : 'You are in room:'}</p>
            <div className="font-display font-bold text-4xl tracking-[0.3em] bg-lime border-2 border-ink py-3 my-3 cursor-pointer" onClick={copyCode} title="Click to copy">
              {room.code} {copied ? '✓' : '⧉'}
            </div>
            {room.isHost
              ? <p className="text-smoke text-sm">Everyone hears your queue, play/pause, and seeks in sync.</p>
              : <p className="text-smoke text-sm">The host controls playback. Sit back and listen.</p>}
            <button className="brut-btn-coral w-full mt-4" onClick={() => { leaveRoom(); onClose(); }}>Leave room</button>
          </div>
        ) : (
          <>
            <button className="brut-btn w-full" onClick={handleCreate} disabled={busy}>
              {busy ? 'Creating…' : 'Create a room'}
            </button>
            <div className="text-center text-smoke text-sm my-4 font-display uppercase">or join with a code</div>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="ABC123" maxLength={6}
                className="brut-input flex-1 text-center text-xl tracking-[0.3em] font-display uppercase"
                aria-label="Room code"
              />
              <button onClick={handleJoin} disabled={busy} className="brut-btn">Join</button>
            </div>
            {error && <div className="bg-coral text-paper border-2 border-ink px-3 py-2 text-sm font-medium mt-3">{error}</div>}
          </>
        )}
      </motion.div>
    </div>
  );
}
