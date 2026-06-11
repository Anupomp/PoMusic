import { useState } from 'react';
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Listen together</h2>
          <button className="delete-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {room ? (
          <div className="lt-active">
            <p className="muted">{room.isHost ? 'You are hosting. Share this code:' : 'You are in room:'}</p>
            <div className="room-code" onClick={copyCode} title="Click to copy">
              {room.code} {copied ? '✓' : '⧉'}
            </div>
            {room.isHost
              ? <p className="muted">Everyone in the room hears your queue, play/pause, and seeks in sync.</p>
              : <p className="muted">The host controls playback. Sit back and listen.</p>}
            <button className="danger-btn" onClick={() => { leaveRoom(); onClose(); }}>Leave room</button>
          </div>
        ) : (
          <>
            <button className="primary-btn" onClick={handleCreate} disabled={busy}>
              {busy ? 'Creating…' : 'Create a room'}
            </button>
            <div className="lt-divider">or join with a code</div>
            <div className="lt-join">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="ABC123"
                maxLength={6}
                aria-label="Room code"
              />
              <button onClick={handleJoin} disabled={busy}>Join</button>
            </div>
            {error && <div className="search-error">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
