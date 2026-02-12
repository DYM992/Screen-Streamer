import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { toast } from "sonner";

export interface StreamSource {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'camera';
  stream?: MediaStream;
  deviceId?: string;
  isActive: boolean;
}

export const useStreamManager = (roomName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const sourcesRef = useRef<StreamSource[]>([]);

  // Load saved configuration on mount
  useEffect(() => {
    const saved = localStorage.getItem(`room_meta_${roomName}`);
    if (saved) {
      const metadata = JSON.parse(saved);
      setSources(metadata.map((m: any) => ({ ...m, isActive: false, stream: undefined })));
    }
  }, [roomName]);

  // Save configuration whenever sources change
  useEffect(() => {
    sourcesRef.current = sources;
    if (roomName && sources.length > 0) {
      const metadata = sources.map(s => ({
        id: s.id,
        label: s.label,
        type: s.type,
        deviceId: s.deviceId
      }));
      localStorage.setItem(`room_meta_${roomName}`, JSON.stringify(metadata));
      
      const rooms = JSON.parse(localStorage.getItem('streamsync_rooms') || '[]');
      if (!rooms.includes(roomName)) {
        localStorage.setItem('streamsync_rooms', JSON.stringify([roomName, ...rooms].slice(0, 5)));
      }
    }
  }, [sources, roomName]);

  const updateEncodingParameters = useCallback((mediaCall: any) => {
    const applyParams = () => {
      // @ts-ignore
      const pc = mediaCall.peerConnection as RTCPeerConnection;
      if (!pc) return;

      pc.getSenders().forEach(sender => {
        if (sender.track?.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
          params.encodings[0].scaleResolutionDownBy = 1.0;
          // @ts-ignore
          params.degradationPreference = 'maintain-resolution';
          params.encodings[0].maxBitrate = 10000000;
          sender.setParameters(params).catch(() => {});
        }
      });
    };

    const checkInterval = setInterval(() => {
      // @ts-ignore
      const pc = mediaCall.peerConnection as RTCPeerConnection;
      if (pc && pc.iceConnectionState === 'connected') {
        applyParams();
        clearInterval(checkInterval);
      }
    }, 500);
    setTimeout(() => clearInterval(checkInterval), 10000);
  }, []);

  const toggleBroadcasting = useCallback(() => {
    if (isBroadcasting) {
      peer?.destroy();
      setPeer(null);
      setConnections(new Set());
      setIsBroadcasting(false);
      toast.info("Broadcasting stopped");
    } else {
      const newPeer = new Peer(roomName, {
        debug: 1,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });

      newPeer.on('open', () => {
        setIsBroadcasting(true);
        toast.success("Broadcasting live!");
      });

      newPeer.on('connection', (conn) => {
        setConnections(prev => new Set(prev).add(conn.peer));
        conn.on('close', () => setConnections(prev => {
          const next = new Set(prev);
          next.delete(conn.peer);
          return next;
        }));
      });

      newPeer.on('call', (call) => {
        call.answer();
        sourcesRef.current.forEach(source => {
          if (source.stream && source.isActive) {
            const mediaCall = newPeer.call(call.peer, source.stream, {
              metadata: { id: source.id, label: source.label, type: source.type === 'camera' ? 'video' : source.type }
            });
            updateEncodingParameters(mediaCall);
          }
        });
      });

      newPeer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          toast.error("Room ID already in use. Try another.");
        }
        setIsBroadcasting(false);
      });

      setPeer(newPeer);
    }
  }, [isBroadcasting, roomName, peer, updateEncodingParameters]);

  const activateSource = useCallback(async (id: string) => {
    const source = sourcesRef.current.find(s => s.id === id);
    if (!source) return;

    try {
      let stream: MediaStream;
      if (source.type === 'video') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else if (source.type === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { deviceId: source.deviceId ? { exact: source.deviceId } : undefined, width: 1920, height: 1080 } 
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { deviceId: source.deviceId ? { exact: source.deviceId } : undefined } 
        });
      }

      setSources(prev => prev.map(s => s.id === id ? { ...s, stream, isActive: true } : s));
      return true;
    } catch (err) {
      toast.error(`Failed to activate ${source.label}`);
      return false;
    }
  }, []);

  const deactivateSource = useCallback((id: string) => {
    setSources(prev => prev.map(s => {
      if (s.id === id) {
        if (s.stream) s.stream.getTracks().forEach(t => t.stop());
        return { ...s, stream: undefined, isActive: false };
      }
      return s;
    }));
  }, []);

  const addSource = useCallback(async (type: 'video' | 'audio' | 'camera') => {
    const id = `${type[0]}-${Math.random().toString(36).substr(2, 5)}`;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Add to state first so activateSource can find it
    setSources(prev => [...prev, { id, label, type, isActive: false }]);
    
    // Small delay to ensure state is updated before activation
    setTimeout(() => activateSource(id), 50);
  }, [activateSource]);

  const removeSource = useCallback((id: string) => {
    setSources(prev => {
      const source = prev.find(s => s.id === id);
      if (source?.stream) source.stream.getTracks().forEach(t => t.stop());
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const updateSourceLabel = useCallback((id: string, label: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  const reconnectAll = useCallback(async () => {
    const inactive = sources.filter(s => !s.isActive);
    if (inactive.length === 0) return;
    
    toast.promise(
      Promise.all(inactive.map(s => activateSource(s.id))),
      {
        loading: 'Reconnecting sources...',
        success: 'Sources reconnected',
        error: 'Some sources failed to reconnect'
      }
    );
  }, [sources, activateSource]);

  return { 
    sources, 
    connections: connections.size, 
    isBroadcasting,
    toggleBroadcasting,
    addSource,
    activateSource,
    deactivateSource,
    removeSource,
    updateSourceLabel,
    reconnectAll
  };
};