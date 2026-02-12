import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { toast } from "sonner";

export interface StreamSource {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'camera';
  stream: MediaStream;
  scaleFactor?: number;
  deviceId?: string;
}

export const useStreamManager = (roomName: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const sourcesRef = useRef<StreamSource[]>([]);

  useEffect(() => {
    sourcesRef.current = sources;
    // Save configuration to localStorage (metadata only)
    if (roomName) {
      const metadata = sources.map(s => ({
        id: s.id,
        label: s.label,
        type: s.type,
        deviceId: s.deviceId
      }));
      localStorage.setItem(`room_${roomName}`, JSON.stringify(metadata));
      
      // Update global rooms list for dashboard
      const rooms = JSON.parse(localStorage.getItem('streamsync_rooms') || '[]');
      if (!rooms.includes(roomName)) {
        localStorage.setItem('streamsync_rooms', JSON.stringify([roomName, ...rooms].slice(0, 5)));
      }
    }
  }, [sources, roomName]);

  const updateEncodingParameters = useCallback((mediaCall: any, source: StreamSource) => {
    const applyParams = () => {
      // @ts-ignore
      const pc = mediaCall.peerConnection as RTCPeerConnection;
      if (!pc) return;

      pc.getSenders().forEach(sender => {
        if (sender.track?.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          
          params.encodings[0].scaleResolutionDownBy = source.scaleFactor || 1.0;
          // @ts-ignore
          params.degradationPreference = 'maintain-framerate';
          params.encodings[0].maxBitrate = 8000000;
          params.encodings[0].maxFramerate = 60;
          
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

  useEffect(() => {
    if (!roomName) return;

    const newPeer = new Peer(roomName, {
      debug: 1,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      }
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
        const mediaCall = newPeer.call(call.peer, source.stream, {
          metadata: { id: source.id, label: source.label, type: source.type === 'camera' ? 'video' : source.type }
        });
        updateEncodingParameters(mediaCall, source);
      });
    });

    setPeer(newPeer);
    return () => newPeer.destroy();
  }, [roomName, updateEncodingParameters]);

  const optimizeTrack = (track: MediaStreamTrack) => {
    if (track.kind === 'video') {
      // @ts-ignore
      if ('contentHint' in track) track.contentHint = 'motion';
    }
  };

  const addScreenSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 } },
        audio: true
      });
      stream.getTracks().forEach(optimizeTrack);
      const id = `v-${Math.random().toString(36).substr(2, 5)}`;
      setSources(prev => [...prev, { id, label: "Screen Capture", type: 'video', stream, scaleFactor: 1 }]);
      toast.success("Screen added");
    } catch (err) {}
  }, []);

  const addCameraSource = useCallback(async (deviceId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: deviceId ? { exact: deviceId } : undefined, frameRate: { ideal: 30 } },
        audio: false 
      });
      const id = `c-${Math.random().toString(36).substr(2, 5)}`;
      setSources(prev => [...prev, { id, label: "Camera", type: 'camera', stream, deviceId }]);
      toast.success("Camera added");
    } catch (err) {
      toast.error("Camera access failed");
    }
  }, []);

  const addMicSource = useCallback(async (deviceId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined } 
      });
      const id = `a-${Math.random().toString(36).substr(2, 5)}`;
      setSources(prev => [...prev, { id, label: "Microphone", type: 'audio', stream, deviceId }]);
      toast.success("Microphone added");
    } catch (err) {
      toast.error("Mic access failed");
    }
  }, []);

  const replaceSourceStream = useCallback(async (id: string, type: 'video' | 'audio' | 'camera', deviceId?: string) => {
    try {
      let newStream: MediaStream;
      if (type === 'video') {
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else if (type === 'camera') {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined } });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined } });
      }
      newStream.getTracks().forEach(optimizeTrack);
      setSources(prev => prev.map(s => {
        if (s.id === id) {
          s.stream.getTracks().forEach(t => t.stop());
          return { ...s, stream: newStream, deviceId };
        }
        return s;
      }));
      toast.success("Source updated");
    } catch (err) {
      toast.error("Update failed");
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

  return { sources, connections: connections.size, addScreenSource, addCameraSource, addMicSource, replaceSourceStream, updateSourceLabel, removeSource };
};