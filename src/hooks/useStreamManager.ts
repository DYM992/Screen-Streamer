import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
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

  // Sync ref for peer callbacks to avoid stale closures
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  // Initialize Peer
  useEffect(() => {
    if (!peerId) return;

    const newPeer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    });

    newPeer.on('open', (id) => {
      console.log('Broadcaster active on room:', id);
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
      console.log('Incoming call from receiver:', call.peer);
      call.answer(); // Answer with nothing initially
      
      // Then push all current streams to the receiver
      sourcesRef.current.forEach(source => {
        newPeer.call(call.peer, source.stream, {
          metadata: { id: source.id, label: source.label, type: source.type }
        });
      });
    });

    newPeer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        toast.error("Room ID already taken. Try a different name.");
      } else {
        console.error('Peer error:', err);
      }
    });

    setPeer(newPeer);
    return () => {
      newPeer.destroy();
    };
  }, [peerId]);

  const addScreenSource = useCallback(async () => {
    try {
      console.log("Requesting screen capture...");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: true
      });
      
      const id = `v-${Math.random().toString(36).substr(2, 5)}`;
      const newSource: StreamSource = {
        id,
        label: "Screen Capture",
        type: 'video',
        stream
      };

      setSources(prev => [...prev, newSource]);
      toast.success("Screen source added");

      // Handle system audio if present
      if (stream.getAudioTracks().length > 0) {
        const audioId = `a-sys-${Math.random().toString(36).substr(2, 5)}`;
        const audioSource: StreamSource = {
          id: audioId,
          label: "System Audio",
          type: 'audio',
          stream: new MediaStream(stream.getAudioTracks())
        };
        setSources(prev => [...prev, audioSource]);
      }
    } catch (err: any) {
      console.error("Screen capture error:", err);
      toast.error(`Screen capture failed: ${err.name === 'NotAllowedError' ? 'Permission denied' : err.message}`);
    }
  }, []);

  const addMicSource = useCallback(async (deviceId?: string) => {
    try {
      console.log("Requesting mic access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: deviceId ? { deviceId: { exact: deviceId } } : true 
      });
      
      const id = `a-mic-${Math.random().toString(36).substr(2, 5)}`;
      const newSource: StreamSource = {
        id,
        label: "Microphone",
        type: 'audio',
        stream
      };
      setSources(prev => [...prev, newSource]);
      toast.success("Microphone added");
    } catch (err: any) {
      console.error("Mic access error:", err);
      toast.error(`Mic access failed: ${err.name === 'NotAllowedError' ? 'Permission denied' : err.message}`);
    }
  }, []);

  const replaceSourceStream = useCallback(async (id: string, type: 'video' | 'audio', deviceId?: string) => {
    try {
      let newStream: MediaStream;
      if (type === 'video') {
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: true });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({ 
          audio: deviceId ? { deviceId: { exact: deviceId } } : true 
        });
      }

      setSources(prev => prev.map(s => {
        if (s.id === id) {
          s.stream.getTracks().forEach(t => t.stop());
          return { ...s, stream: newStream };
        }
        return s;
      }));
      
      toast.success("Source updated");
    } catch (err: any) {
      toast.error("Failed to update source");
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
    toast.info("Source removed");
  }, []);

  return {
    peer,
    sources,
    connections: connections.size,
    addScreenSource,
    addMicSource,
    replaceSourceStream,
    updateSourceLabel,
    removeSource
  };
};