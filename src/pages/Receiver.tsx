import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Peer from 'peerjs';

interface RemoteSource {
  id: string;
  label: string;
  type: 'video' | 'audio';
  stream: MediaStream;
}

const Receiver = () => {
  const navigate = useNavigate();
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

  if (status === 'error') return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <p className="text-red-500 font-bold">Connection failed. Check Room ID.</p>
      <Button variant="outline" onClick={() => navigate('/')} className="border-slate-800 text-white">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Button>
    </div>
  );

  if (status === 'connecting') return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <p className="text-white animate-pulse">Connecting to {room}...</p>
      <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-500">Cancel</Button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden group">
      <div className="absolute top-4 left-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => navigate('/')}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Exit Receiver
        </Button>
      </div>

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
                autoPlay playsInline muted controls={false}
                ref={el => { if (el && el.srcObject !== source.stream) el.srcObject = source.stream; }}
                className="w-full h-full object-contain"
              />
            ) : (
              <audio autoPlay ref={el => { if (el && el.srcObject !== source.stream) el.srcObject = source.stream; }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Receiver;