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

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

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
      call.answer();
      sourcesRef.current.forEach(source => {
        newPeer.call(call.peer, source.stream, {
          metadata: { id: source.id, label: source.label, type: source.type }
        });
      });
    });

    newPeer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        toast.error("Room ID already taken. Try a different name.");
      }
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
        label: "Screen Capture",
        type: 'video',
        stream
      };

      setSources(prev => [...prev, newSource]);
      toast.success("Screen source added");

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
      if (err.name !== 'NotAllowedError') {
        toast.error(`Screen capture failed: ${err.message}`);
      }
    }
  }, []);

  const addMicSource = useCallback(async (deviceId?: string) => {
    try {
      // Safety check: ensure deviceId is a string and not a React event object
      const actualDeviceId = typeof deviceId === 'string' ? deviceId : undefined;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: actualDeviceId ? { deviceId: { exact: actualDeviceId } } : true 
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
      toast.error(`Mic access failed: ${err.message}`);
    }
  }, []);

  const replaceSourceStream = useCallback(async (id: string, type: 'video' | 'audio', deviceId?: string) => {
    try {
      const actualDeviceId = typeof deviceId === 'string' ? deviceId : undefined;
      let newStream: MediaStream;
      
      if (type === 'video') {
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: true });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({ 
          audio: actualDeviceId ? { deviceId: { exact: actualDeviceId } } : true 
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