import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { usePlayer } from '../store';
import { formatDuration } from '../types';

export default function Queue() {
  const { queue, currentIndex, playIndex, removeFromQueue, reorderQueue, room } = usePlayer();
  const isGuest = room !== null && !room.isHost;

  function onDragEnd(result: DropResult) {
    if (!result.destination || isGuest) return;
    reorderQueue(result.source.index, result.destination.index);
  }

  if (!queue.length) {
    return (
      <div className="queue-empty">
        <p>Your queue is empty.</p>
        <p className="muted">Search for a song above to start listening.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="queue">
        {(provided) => (
          <div className="queue" ref={provided.innerRef} {...provided.droppableProps}>
            {queue.map((track, i) => (
              <Draggable key={`${track.id}-${i}`} draggableId={`${track.id}-${i}`} index={i} isDragDisabled={isGuest}>
                {(prov, snapshot) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={[
                      'queue-item',
                      i === currentIndex ? 'active' : '',
                      snapshot.isDragging ? 'dragging' : '',
                    ].join(' ')}
                  >
                    <img src={track.thumb} alt="" className="track-thumb" onClick={() => !isGuest && playIndex(i)} />
                    <div className="track-info" onClick={() => !isGuest && playIndex(i)}>
                      <div className="track-title">{track.title}</div>
                      <div className="track-channel">{track.channel}</div>
                    </div>
                    <span className="track-duration">{formatDuration(track.duration)}</span>
                    {!isGuest && (
                      <button
                        className="delete-btn"
                        aria-label={`Remove ${track.title} from queue`}
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
