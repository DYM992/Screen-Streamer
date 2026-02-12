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
              if ('playoutDelayHint' in receiver) receiver.playoutDelayHint = 0.1; 
            });
          }

          const metadata = (incomingCall as any).metadata || {};
          const newSource: RemoteSource = {
            id: metadata.id || `remote-${Date.now()}`,
            label: metadata.label || 'Remote Stream',
            type: metadata.type || 'video',
            stream: remoteStream
          };

          setSources(prev => {
            if (prev.find(s => s.id === newSource.id)) return prev;
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

  if (status === 'error') return null; // Keep it clean for OBS
  if (status === 'connecting') return null; // Keep it clean for OBS

  return (
    <div className="fixed inset-0 bg-transparent overflow-hidden">
      <div className="grid grid-cols-1 w-full h-full">
        {displayedSources.map(source => (
          <div key={source.id} className="relative w-full h-full bg-transparent">
            {source.type === 'video' ? (
              <video 
                autoPlay 
                playsInline 
                muted 
                controls={false}
                ref={el => { if (el && el.srcObject !== source.stream) el.srcObject = source.stream; }}
                className="w-full h-full object-contain bg-transparent"
              />
            ) : (
              /* Audio only sources render nothing visible to avoid black boxes in OBS */
              <audio 
                autoPlay 
                ref={el => { if (el && el.srcObject !== source.stream) el.srcObject = source.stream; }} 
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Receiver;