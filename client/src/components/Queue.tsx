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
      <div className="text-center py-16 border-2 border-dashed border-ink bg-paper">
        <p className="font-display font-bold uppercase text-lg">Queue is empty</p>
        <p className="text-smoke text-sm mt-1">Search for a song above to start.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="queue">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2">
            {queue.map((track, i) => (
              <Draggable key={`${track.id}-${i}`} draggableId={`${track.id}-${i}`} index={i} isDragDisabled={isGuest}>
                {(prov, snapshot) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={[
                      'flex items-center gap-3 border-2 border-ink px-3 py-2.5 transition-colors',
                      i === currentIndex ? 'bg-lime shadow-brut-sm' : 'bg-paper',
                      snapshot.isDragging ? 'shadow-brut-lg' : '',
                    ].join(' ')}
                  >
                    <img
                      src={track.thumb} alt=""
                      className="w-[72px] h-10 object-cover border-2 border-ink cursor-pointer"
                      onClick={() => !isGuest && playIndex(i)}
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !isGuest && playIndex(i)}>
                      <div className={`text-sm truncate ${i === currentIndex ? 'font-bold' : 'font-medium'}`}>
                        {track.title}
                      </div>
                      <div className="text-xs text-smoke">{track.channel}</div>
                    </div>
                    <span className="text-xs text-smoke tabular-nums">{formatDuration(track.duration)}</span>
                    {!isGuest && (
                      <button
                        aria-label={`Remove ${track.title}`}
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                        className="icon-square w-7 h-7 hover:bg-coral hover:text-paper"
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
