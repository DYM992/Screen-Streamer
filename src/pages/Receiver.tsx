import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer from 'peerjs';

interface RemoteSource {
  id: string;
  label: string;
  type: 'video' | 'audio';
  stream: MediaStream;
}

const Receiver = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room');
  const targetSourceId = searchParams.get('sourceId');
  const [sources, setSources] = useState<RemoteSource[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    if (!room) {
      setStatus('error');
      return;
    }

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      setStatus('connected');
      peer.on('call', (incomingCall) => {
        incomingCall.answer();
        incomingCall.on('stream', (remoteStream) => {
          // @ts-ignore
          const pc = incomingCall.peerConnection as RTCPeerConnection;
          if (pc) {
            pc.getReceivers().forEach(receiver => {
              // @ts-ignore
              if ('playoutDelayHint' in receiver) receiver.playoutDelayHint = 0.0;
            });
          }

          const metadata = (incomingCall as any).metadata || {};
          const sourceId = metadata.id || `remote-${Date.now()}`;
          const newSource: RemoteSource = {
            id: sourceId,
            label: metadata.label || 'Remote Stream',
            type: metadata.type || 'video',
            stream: remoteStream,
          };

          setSources(prev => {
            const existingIndex = prev.findIndex(s => s.id === sourceId);
            if (existingIndex !== -1) {
              // Replace the stream for the existing source (auto‑refresh)
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], stream: remoteStream };
              return updated;
            }
            // Add new source if not present
            return [...prev, newSource];
          });
        });
      });
      peer.call(room, new MediaStream());
    });

    peer.on('error', () => setStatus('error'));
    return () => peer.destroy();
  }, [room]);

  const displayedSources = targetSourceId
    ? sources.filter(s => s.id === targetSourceId)
    : sources;

  if (status === 'error') return null;
  if (status === 'connecting') return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center">
      {displayedSources.map(source => (
        <div key={source.id} className={`relative ${source.type === 'audio' ? 'hidden' : ''} w-full h-full`}>
          {source.type === 'video' ? (
            <video
              autoPlay
              playsInline
              muted
              controls={false}
              ref={el => {
                if (el && el.srcObject !== source.stream) el.srcObject = source.stream;
              }}
              className="w-screen h-screen object-fill bg-transparent"
            />
          ) : (
            <audio
              autoPlay
              ref={el => {
                if (el && el.srcObject !== source.stream) el.srcObject = source.stream;
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Receiver;