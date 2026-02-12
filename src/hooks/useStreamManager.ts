import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface StreamSource {
  id: string;
  dbId?: string;
  label: string;
  type: 'video' | 'audio' | 'camera';
  stream?: MediaStream;
  deviceId?: string;
  isActive: boolean;
  isEnabled: boolean;
}

export const useStreamManager = (roomName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const sourcesRef = useRef<StreamSource[]>([]);
  const isBroadcastingRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    sourcesRef.current = sources;
    isBroadcastingRef.current = isBroadcasting;
  }, [sources, isBroadcasting]);

  // Load room and sources from Supabase
  useEffect(() => {
    const loadRoom = async () => {
      if (!roomName) return;

      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomName)
        .single();

      if (!room) {
        await supabase.from('rooms').insert({ id: roomName });
      }

      const { data: dbSources } = await supabase
        .from('sources')
        .select('*')
        .eq('room_id', roomName);

      if (dbSources) {
        const mappedSources: StreamSource[] = dbSources.map(s => ({
          id: s.id,
          dbId: s.id,
          label: s.label,
          type: s.type as any,
          deviceId: s.device_id,
          isEnabled: s.is_enabled,
          isActive: false
        }));
        setSources(mappedSources);

        // Auto-activate enabled sources (except video/screen share)
        mappedSources.forEach(s => {
          if (s.isEnabled && s.type !== 'video') {
            activateSource(s.id);
          }
        });
      }
    };

    loadRoom();
  }, [roomName]);

  const saveToDatabase = useCallback(async () => {
    if (!roomName) return;

    // Update room live status
    await supabase
      .from('rooms')
      .update({ is_live: isBroadcastingRef.current })
      .eq('id', roomName);

    // Update sources
    for (const source of sourcesRef.current) {
      if (source.dbId) {
        await supabase
          .from('sources')
          .update({ 
            label: source.label, 
            is_enabled: source.isEnabled,
            device_id: source.deviceId 
          })
          .eq('id', source.dbId);
      }
    }
  }, [roomName]);

  // Save on unmount and window close
  useEffect(() => {
    const handleUnload = () => {
      // Stop all tracks immediately
      sourcesRef.current.forEach(s => s.stream?.getTracks().forEach(t => t.stop()));
      
      // Use beacon or sync fetch for reliable saving on close
      const data = JSON.stringify({ is_live: false });
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rooms?id=eq.${roomName}`, blob);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      saveToDatabase();
      window.removeEventListener('beforeunload', handleUnload);
      sourcesRef.current.forEach(s => s.stream?.getTracks().forEach(t => t.stop()));
    };
  }, [roomName, saveToDatabase]);

  const captureThumbnail = useCallback(async () => {
    const videoSource = sourcesRef.current.find(s => s.isActive && (s.type === 'video' || s.type === 'camera'));
    if (!videoSource?.stream) return;

    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.srcObject = videoSource.stream;
    
    video.onloadedmetadata = async () => {
      video.play();
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext('2d');
      setTimeout(async () => {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        await supabase.from('rooms').update({ thumbnail: dataUrl }).eq('id', roomName);
        video.srcObject = null;
      }, 500);
    };
  }, [roomName]);

  const stopAllSources = useCallback(() => {
    // Stop media tracks and reset active flags
    sourcesRef.current.forEach(source => {
      if (source.stream) {
        source.stream.getTracks().forEach(track => track.stop());
      }
    });
    setSources(prev =>
      prev.map(s => ({
        ...s,
        stream: undefined,
        isActive: false,
      }))
    );
  }, []);

  const toggleBroadcasting = useCallback(async () => {
    if (isBroadcasting) {
      // Stop all active streams before destroying the peer
      stopAllSources();

      peer?.destroy();
      setPeer(null);
      setConnections(new Set());
      setIsBroadcasting(false);
      await supabase.from('rooms').update({ is_live: false }).eq('id', roomName);
      toast.info("Broadcasting stopped");
    } else {
      const newPeer = new Peer(roomName, {
        debug: 1,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });

      newPeer.on('open', async () => {
        setIsBroadcasting(true);
        await supabase.from('rooms').update({ is_live: true }).eq('id', roomName);
        toast.success("Broadcasting live!");
        setTimeout(captureThumbnail, 3000);
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
  }, [isBroadcasting, roomName, peer, captureThumbnail, stopAllSources]);

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

  const addSource = useCallback(async (type: 'video' | 'audio' | 'camera') => {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const { data } = await supabase
      .from('sources')
      .insert({ room_id: roomName, label, type, is_enabled: true })
      .select()
      .single();

    if (data) {
      const newSource: StreamSource = {
        id: data.id,
        dbId: data.id,
        label: data.label,
        type: data.type as any,
        isActive: false,
        isEnabled: true
      };
      setSources(prev => [...prev, newSource]);
      setTimeout(() => activateSource(newSource.id), 50);
    }
  }, [roomName, activateSource]);

  const removeSource = useCallback(async (id: string) => {
    const source = sourcesRef.current.find(s => s.id === id);
    source?.stream?.getTracks().forEach(t => t.stop());
    setSources(prev => prev.filter(s => s.id !== id));
    await supabase.from('sources').delete().eq('id', id);
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
    reconnectAll,
    saveToDatabase
  };
};