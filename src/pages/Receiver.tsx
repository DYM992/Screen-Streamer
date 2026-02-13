import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer from 'peerjs';

interface RemoteSource {
  id: string;
  label: string;
  type: 'video' | 'audio' | string; // allow custom types like "video/webm"
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
          const metadata = (incomingCall as any).metadata || {};
          const sourceId = metadata.id || `remote-${Date.now()}`;
          const newSource: RemoteSource = {
            id: sourceId,
            label: metadata.label || 'Remote Stream',
            type: metadata.type || 'video',
            stream: remoteStream,
          };
          setSources(prev => {
            const existing = prev.findIndex(s => s.id === sourceId);
            if (existing !== -1) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], stream: remoteStream };
              return updated;
            }
            return [...prev, newSource];
          });
        });
      });
      // Initiate a dummy call to trigger the broadcaster's source calls
      peer.call(room, new MediaStream());
    });

    peer.on('error', () => setStatus('error'));
    return () => peer.destroy();
  }, [room]);

  const displayedSources = targetSourceId
    ? sources.filter(s => s.id === targetSourceId)
    : sources;

  if (status === 'error') return null;
  if (status === 'loading') return null;

  // Show a waiting UI when no matching source is yet available
  if (displayedSources.length === 0) {
    return (
      <div className="fixed inset-0 bg-transparent flex items-center justify-center">
        <p className="text-sm text-slate-400">Waiting for stream…</p>
      </div>
    );
  }

  // Autoplay all video elements once streams are attached
  useEffect(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
      // Ensure the video element is playing; ignore errors (e.g., autoplay blocked)
      v.play().catch(() => {});
    });
  }, [displayedSources]);

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center">
      {displayedSources.map(source => (
        <div key={source.id} className={`relative ${source.type === 'audio' ? 'hidden' : ''} w-full h-full`}>
          {source.type === 'audio' ? (
            <audio autoPlay ref={el => { if (el && el.srcObject !== source.stream) el.srcObject = source.stream; }} />
          ) : (
            <video
              autoPlay
              playsInline
              muted={false}
              controls={false}
              ref={el => { if (el && el.srcObject !== source.stream) el.srcObject = source.stream; }}
              className="w-screen h-screen object-fill bg-black"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Receiver;