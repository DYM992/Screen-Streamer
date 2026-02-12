import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { toast } from "sonner";
import { supabase } from "@/utils/supabase/client";

export interface StreamSource {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'camera';
  stream?: MediaStream;
  isActive: boolean;
  isEnabled: boolean;
}

export const useStreamManager = (roomName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const sourcesRef = useRef<StreamSource[]>([]);
  const peerRef = useRef<Peer | null>(null);

  // Keep refs in sync for cleanup/exit logic
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  // Function to save current state to Supabase
  const saveToDatabase = useCallback(async () => {
    if (!roomName) return;

    try {
      // 1. Ensure room exists
      await supabase.from('rooms').upsert({ id: roomName }, { onConflict: 'id' });

      // 2. Prepare sources for sync
      // We delete existing sources for this room and re-insert the current state
      // to ensure the DB perfectly matches the local session on exit.
      await supabase.from('sources').delete().eq('room_id', roomName);

      if (sourcesRef.current.length > 0) {
        const sourcesToInsert = sourcesRef.current.map(s => ({
          room_id: roomName,
          label: s.label,
          type: s.type,
          is_enabled: s.isEnabled
        }));

        await supabase.from('sources').insert(sourcesToInsert);
      }

      // 3. Update thumbnail if we have an active video
      const videoSource = sourcesRef.current.find(s => s.isActive && (s.type === 'video' || s.type === 'camera'));
      if (videoSource?.stream) {
        const canvas = document.createElement('canvas');
        const video = document.createElement('video');
        video.srcObject = videoSource.stream;
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            canvas.width = 480;
            canvas.height = 270;
            const ctx = canvas.getContext('2d');
            setTimeout(() => {
              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
              supabase.from('rooms').update({ thumbnail: dataUrl }).eq('id', roomName).then(resolve);
            }, 100);
          };
        });
      }
    } catch (err) {
      console.error("Failed to save room state on exit", err);
    }
  }, [roomName]);

  // Cleanup and Save on Exit
  useEffect(() => {
    const handleExit = () => {
      // Stop all streams
      sourcesRef.current.forEach(s => {
        s.stream?.getTracks().forEach(t => t.stop());
      });

      // Destroy peer
      if (peerRef.current) {
        peerRef.current.destroy();
      }

      // Save state (using sync XHR or beacon if possible, but standard async might work in some browsers)
      saveToDatabase();
    };

    window.addEventListener('beforeunload', handleExit);
    
    return () => {
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, [saveToDatabase]);

  // Initial Load
  useEffect(() => {
    const loadRoom = async () => {
      if (!roomName) return;

      const { data: dbSources } = await supabase
        .from('sources')
        .select('*')
        .eq('room_id', roomName);

      if (dbSources && dbSources.length > 0) {
        const mappedSources: StreamSource[] = dbSources.map(s => ({
          id: s.id, // Use DB ID as local ID
          label: s.label,
          type: s.type as any,
          isEnabled: s.is_enabled,
          isActive: false
        }));
        setSources(mappedSources);

        // Auto-activate non-screen sources
        mappedSources.forEach(s => {
          if (s.isEnabled && s.type !== 'video') {
            activateSource(s.id);
          }
        });
      }
    };

    loadRoom();
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

      newPeer.on('error', (err) => {
        console.error("Peer error:", err);
        setIsBroadcasting(false);
      });
      setPeer(newPeer);
    }
  }, [isBroadcasting, roomName, peer]);

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

      setSources(prev => prev.map(s => s.id === id ? { ...s, stream, isActive: true, isEnabled: true } : s));
      return true;
    } catch (err) {
      console.error("Activation failed", err);
      toast.error(`Failed to access ${source.type}`);
      return false;
    }
  }, []);

  const deactivateSource = useCallback((id: string) => {
    setSources(prev => prev.map(s => {
      if (s.id === id) {
        s.stream?.getTracks().forEach(t => t.stop());
        return { ...s, stream: undefined, isActive: false, isEnabled: false };
      }
      return s;
    }));
  }, []);

  const addSource = useCallback((type: 'video' | 'audio' | 'camera') => {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const tempId = crypto.randomUUID();

    const newSource: StreamSource = {
      id: tempId,
      label,
      type,
      isActive: false,
      isEnabled: true
    };

    setSources(prev => [...prev, newSource]);
    // Small delay to ensure state is updated before activation
    setTimeout(() => activateSource(tempId), 50);
  }, [activateSource]);

  const removeSource = useCallback((id: string) => {
    const source = sourcesRef.current.find(s => s.id === id);
    if (source?.stream) source.stream.getTracks().forEach(t => t.stop());
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSourceLabel = useCallback((id: string, label: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  const reconnectAll = useCallback(async () => {
    const enabledButInactive = sources.filter(s => s.isEnabled && !s.isActive);
    for (const s of enabledButInactive) {
      await activateSource(s.id);
    }
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