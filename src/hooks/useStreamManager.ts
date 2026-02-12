import { useState, useCallback, useEffect, useRef } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { toast } from "sonner";

export interface StreamSource {
  id: string;
  label: string;
  type: 'video' | 'audio';
  stream: MediaStream;
}

export const useStreamManager = (peerId?: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const sourcesRef = useRef<StreamSource[]>([]);

  // Keep ref in sync for the peer event handlers
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    const newPeer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    });

    newPeer.on('open', (id) => {
      console.log('Broadcaster active:', id);
    });

    newPeer.on('connection', (conn) => {
      setConnections(prev => new Set(prev).add(conn.peer));
      conn.on('close', () => {
        setConnections(prev => {
          const next = new Set(prev);
          next.delete(conn.peer);
          return next;
        });
      });
    });

    newPeer.on('call', (call) => {
      // When a receiver calls, send all current sources
      sourcesRef.current.forEach(source => {
        newPeer.call(call.peer, source.stream, {
          metadata: { id: source.id, label: source.label, type: source.type }
        });
      });
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [peerId]);

  const addScreenSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: true
      });
      
      const id = `v-${Math.random().toString(36).substr(2, 5)}`;
      const newSource: StreamSource = {
        id,
        label: "Game/App Video",
        type: 'video',
        stream
      };

      setSources(prev => [...prev, newSource]);

      if (stream.getAudioTracks().length > 0) {
        const audioId = `a-sys-${Math.random().toString(36).substr(2, 5)}`;
        const audioSource: StreamSource = {
          id: audioId,
          label: "Game/App Audio",
          type: 'audio',
          stream: new MediaStream(stream.getAudioTracks())
        };
        setSources(prev => [...prev, audioSource]);
      }
    } catch (err: any) {
      toast.error("Capture cancelled or failed");
    }
  }, []);

  const addMicSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const id = `a-mic-${Math.random().toString(36).substr(2, 5)}`;
      const newSource: StreamSource = {
        id,
        label: "Microphone",
        type: 'audio',
        stream
      };
      setSources(prev => [...prev, newSource]);
    } catch (err: any) {
      toast.error("Microphone access denied");
    }
  }, []);

  const updateSourceLabel = useCallback((id: string, label: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources(prev => {
      const source = prev.find(s => s.id === id);
      if (source) source.stream.getTracks().forEach(t => t.stop());
      return prev.filter(s => s.id !== id);
    });
  }, []);

  return {
    peer,
    sources,
    connections: connections.size,
    addScreenSource,
    addMicSource,
    updateSourceLabel,
    removeSource
  };
};