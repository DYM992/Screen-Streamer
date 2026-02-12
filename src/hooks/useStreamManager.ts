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

  // Load saved configuration
  useEffect(() => {
    const saved = localStorage.getItem(`room_meta_${roomName}`);
    if (saved) {
      const metadata = JSON.parse(saved);
      setSources(metadata.map((m: any) => ({ ...m, isActive: false, stream: undefined })));
    }
  }, [roomName]);

  // Save configuration and update room list
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
      
      const rooms = JSON.parse(localStorage.getItem('streamsync_rooms_v2') || '{}');
      if (!rooms[roomName]) {
        rooms[roomName] = { id: roomName, createdAt: new Date().toISOString() };
        localStorage.setItem('streamsync_rooms_v2', JSON.stringify(rooms));
      }
    }
  }, [sources, roomName]);

  const captureThumbnail = useCallback(() => {
    const videoSource = sourcesRef.current.find(s => s.isActive && (s.type === 'video' || s.type === 'camera'));
    if (!videoSource?.stream) return null;

    const videoTrack = videoSource.stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.srcObject = videoSource.stream;
    
    return new Promise<string | null>((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        setTimeout(() => {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          // Update local storage for now, will move to Supabase
          const rooms = JSON.parse(localStorage.getItem('streamsync_rooms_v2') || '{}');
          if (rooms[roomName]) {
            rooms[roomName].thumbnail = dataUrl;
            localStorage.setItem('streamsync_rooms_v2', JSON.stringify(rooms));
          }
          
          video.srcObject = null;
          resolve(dataUrl);
        }, 100);
      };
    });
  }, [roomName]);

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
        // Initial thumbnail capture
        setTimeout(captureThumbnail, 2000);
      });

      newPeer.on('connection', (conn) => {
        setConnections(prev => new Set(prev).add(conn.peer));
      });

      newPeer.on('call', (call) => {
        call.answer();
        sourcesRef.current.forEach(source => {
          if (source.stream && source.isActive) {
            newPeer.call(call.peer, source.stream, {
              metadata: { id: source.id, label: source.label, type: source.type === 'camera' ? 'video' : source.type }
            });
          }
        });
      });

      newPeer.on('error', () => setIsBroadcasting(false));
      setPeer(newPeer);
    }
  }, [isBroadcasting, roomName, peer, captureThumbnail]);

  const activateSource = useCallback(async (id: string) => {
    const source = sourcesRef.current.find(s => s.id === id);
    if (!source) return;

    try {
      let stream: MediaStream;
      if (source.type === 'video') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: source.type === 'camera' ? { width: 1280, height: 720 } : false,
          audio: true 
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
        s.stream?.getTracks().forEach(t => t.stop());
        return { ...s, stream: undefined, isActive: false };
      }
      return s;
    }));
  }, []);

  const addSource = useCallback(async (type: 'video' | 'audio' | 'camera') => {
    const id = `${type[0]}-${Math.random().toString(36).substr(2, 5)}`;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    setSources(prev => [...prev, { id, label, type, isActive: false }]);
    setTimeout(() => activateSource(id), 50);
  }, [activateSource]);

  const removeSource = useCallback((id: string) => {
    setSources(prev => {
      const source = prev.find(s => s.id === id);
      source?.stream?.getTracks().forEach(t => t.stop());
      return prev.filter(s => s.id !== id);
    });
  }, []);

  return { 
    sources, 
    connections: connections.size, 
    isBroadcasting,
    toggleBroadcasting,
    addSource,
    activateSource,
    deactivateSource,
    removeSource,
    captureThumbnail
  };
};