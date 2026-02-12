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
      // Connect to the broadcaster
      peer.call(room, new MediaStream()); 
      
      peer.on('call', (incomingCall) => {
        incomingCall.answer();
        incomingCall.on('stream', (remoteStream) => {
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
    });

    return () => peer.destroy();
  }, [room]);

  const displayedSources = targetSourceId 
    ? sources.filter(s => s.id === targetSourceId)
    : sources;

  if (status === 'error') return <div className="bg-black text-red-500 p-4">Error: No room specified</div>;
  if (status === 'connecting') return <div className="bg-black text-white p-4">Connecting to {room}...</div>;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {displayedSources.length === 0 && (
        <div className="flex items-center justify-center h-full text-slate-700 text-xs uppercase tracking-widest">
          Waiting for sources from {room}...
        </div>
      )}
      
      <div className="grid grid-cols-1 w-full h-full">
        {displayedSources.map(source => (
          <div key={source.id} className="relative w-full h-full bg-black">
            {source.type === 'video' ? (
              <video 
                autoPlay 
                playsInline 
                muted
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                ref={el => { 
                  if (el && el.srcObject !== source.stream) {
                    el.srcObject = source.stream;
                    // Force immediate playback and disable any internal buffering
                    el.play().catch(console.error);
                    // @ts-ignore - some browsers support setting playback rate to keep up
                    el.playbackRate = 1.0;
                  }
                }}
                className="w-full h-full object-contain"
              />
            ) : (
              <audio 
                autoPlay 
                ref={el => { 
                  if (el && el.srcObject !== source.stream) {
                    el.srcObject = source.stream;
                    el.play().catch(console.error);
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Receiver;