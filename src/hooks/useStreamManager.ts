import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface StreamSource {
  id: string;               // UUID from DB
  dbId?: string;
  label: string;            // Human‑readable name (used as sourceId in URLs)
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
  const [fps, setFps] = useState<number>(30);

  const sourcesRef = useRef<StreamSource[]>([]);
  const isBroadcastingRef = useRef(false);

  useEffect(() => {
    sourcesRef.current = sources;
    isBroadcastingRef.current = isBroadcasting;
  }, [sources, isBroadcasting]);

  // Load room and sources
  useEffect(() => {
    const loadRoom = async () => {
      if (!roomName) return;
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomName).single();
      if (!room) await supabase.from('rooms').insert({ id: roomName });

      const { data: dbSources } = await supabase.from('sources').select('*').eq('room_id', roomName);
      if (dbSources) {
        const mapped: StreamSource[] = dbSources.map(s => ({
          id: s.id,
          dbId: s.id,
          label: s.label,
          type: s.type as any,
          deviceId: s.device_id,
          isEnabled: s.is_enabled,
          isActive: false,
        }));
        setSources(mapped);
        // auto‑activate non‑screen sources
        mapped.forEach(s => { if (s.isEnabled && s.type !== 'video') activateSource(s.id); });
      }
    };
    loadRoom();
  }, [roomName]);

  const saveToDatabase = useCallback(async () => {
    if (!roomName) return;
    await supabase.from('rooms').update({ is_live: isBroadcastingRef.current }).eq('id', roomName);
    for (const source of sourcesRef.current) {
      if (source.dbId) {
        await supabase.from('sources').update({
          label: source.label,
          is_enabled: source.isEnabled,
          device_id: source.deviceId,
          type: source.type,
        }).eq('id', source.dbId);
      }
    }
  }, [roomName]);

  // Unload handling
  useEffect(() => {
    const handleUnload = () => {
      sourcesRef.current.forEach(s => s.stream?.getTracks().forEach(t => t.stop()));
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
    sourcesRef.current.forEach(s => s.stream?.getTracks().forEach(t => t.stop()));
    setSources(prev => prev.map(s => ({ ...s, stream: undefined, isActive: false })));
  }, []);

  const toggleBroadcasting = useCallback(async () => {
    if (isBroadcasting) {
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
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      });

      newPeer.on('open', async () => {
        setIsBroadcasting(true);
        await supabase.from('rooms').update({ is_live: true }).eq('id', roomName);
        toast.success("Broadcasting live!");
        setTimeout(captureThumbnail, 3000);
      });

      newPeer.on('connection', (conn) => {
        setConnections(prev => new Set(prev).add(conn.peer));
        conn.on('close', () => setConnections(prev => {
          const set = new Set(prev);
          set.delete(conn.peer);
          return set;
        }));
      });

      newPeer.on('call', (call) => {
        setConnections(prev => new Set(prev).add(call.peer));
        call.answer();
        call.on('close', () => setConnections(prev => {
          const set = new Set(prev);
          set.delete(call.peer);
          return set;
        }));
        sourcesRef.current.forEach(source => {
          if (source.stream && source.isActive) {
            const metaType = source.type === "camera" ? "video/webm" : source.type;
            newPeer.call(call.peer, source.stream, {
              metadata: { id: source.label, label: source.label, type: metaType },
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
    if (source.stream) source.stream.getTracks().forEach(t => t.stop());

    try {
      let stream: MediaStream;
      if (source.type === "video") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: fps },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } else if (source.type === "camera") {
        const constraints: MediaStreamConstraints = {
          video: source.deviceId ? { deviceId: { exact: source.deviceId }, frameRate: fps } : { width: 1280, height: 720, frameRate: fps },
          audio: true,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        const constraints: MediaStreamConstraints = {
          audio: source.deviceId ? { deviceId: { exact: source.deviceId } } : true,
          video: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      setSources(prev => prev.map(s => s.id === id ? { ...s, stream, isActive: true, isEnabled: true } : s));
      return true;
    } catch (err) {
      console.error('Failed to activate source', err);
      toast.error('Unable to access selected device');
      return false;
    }
  }, [fps]);

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
    // Ensure unique label
    const baseLabel = type.charAt(0).toUpperCase() + type.slice(1);
    let label = baseLabel;
    const existingLabels = sources.map(s => s.label);
    let suffix = 1;
    while (existingLabels.includes(label)) {
      label = `${baseLabel}-${suffix}`;
      suffix++;
    }

    const { data } = await supabase.from('sources')
      .insert({ room_id: roomName, label, type, is_enabled: true })
      .select()
      .single();

    if (data) {
      const newSource: StreamSource = {
        id: data.id,
        dbId: data.id,
        label: data.label,
        type: data.type as any,
        deviceId: data.device_id,
        isActive: false,
        isEnabled: true,
      };
      setSources(prev => [...prev, newSource]);
      setTimeout(() => activateSource(newSource.id), 50);
    }
  }, [roomName, sources, activateSource]);

  const removeSource = useCallback(async (id: string) => {
    const source = sourcesRef.current.find(s => s.id === id);
    source?.stream?.getTracks().forEach(t => t.stop());
    setSources(prev => prev.filter(s => s.id !== id));
    await supabase.from('sources').delete().eq('id', id);
  }, []);

  const updateSourceLabel = useCallback((id: string, newLabel: string) => {
    // Prevent duplicate names
    const duplicate = sources.some(s => s.id !== id && s.label === newLabel);
    if (duplicate) {
      toast.error('Source name must be unique in this room');
      return;
    }
    setSources(prev => prev.map(s => s.id === id ? { ...s, label: newLabel } : s));
  }, [sources]);

  const updateSourceDeviceId = useCallback(async (id: string, deviceId: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, deviceId } : s));
    const source = sourcesRef.current.find(s => s.id === id);
    if (source?.dbId) await supabase.from('sources').update({ device_id: deviceId }).eq('id', source.dbId);
    if (source?.isActive) {
      await deactivateSource(id);
      await activateSource(id);
    }
  }, [deactivateSource, activateSource]);

  const reconnectAll = useCallback(async () => {
    const inactive = sources.filter(s => s.isEnabled && !s.isActive);
    for (const s of inactive) await activateSource(s.id);
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
    updateSourceDeviceId,
    reconnectAll,
    saveToDatabase,
    fps,
    setFps,
  };
};