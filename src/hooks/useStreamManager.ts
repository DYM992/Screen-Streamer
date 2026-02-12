import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { toast } from "sonner";

export interface StreamSource {
  id: string;
  label: string;
  type: 'video' | 'audio';
  stream: MediaStream;
  scaleFactor?: number;
}

export const useStreamManager = (peerId?: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const sourcesRef = useRef<StreamSource[]>([]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

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
          params.encodings[0].priority = 'high';
          params.encodings[0].networkPriority = 'high';
          
          sender.setParameters(params).catch(() => {
            // Silently fail if parameters can't be set yet
          });
        }
      });
    };

    // Wait for the peer connection to be available and stable
    const checkInterval = setInterval(() => {
      // @ts-ignore
      const pc = mediaCall.peerConnection as RTCPeerConnection;
      if (pc && pc.iceConnectionState === 'connected') {
        applyParams();
        clearInterval(checkInterval);
      }
    }, 500);

    // Safety timeout
    setTimeout(() => clearInterval(checkInterval), 10000);
  }, []);

  useEffect(() => {
    if (!peerId) return;

    const newPeer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
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
          metadata: { id: source.id, label: source.label, type: source.type }
        });
        updateEncodingParameters(mediaCall, source);
      });
    });

    setPeer(newPeer);
    return () => newPeer.destroy();
  }, [peerId, updateEncodingParameters]);

  const optimizeTrack = (track: MediaStreamTrack) => {
    if (track.kind === 'video') {
      // @ts-ignore
      if ('contentHint' in track) track.contentHint = 'motion';
      track.applyConstraints({ frameRate: { ideal: 60 } }).catch(console.error);
    }
  };

  const addScreenSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 }, cursor: 'always' },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      
      stream.getTracks().forEach(optimizeTrack);
      
      const id = `v-${Math.random().toString(36).substr(2, 5)}`;
      const newSource: StreamSource = {
        id,
        label: "Screen Capture",
        type: 'video',
        stream,
        scaleFactor: 1.5
      };

      setSources(prev => [...prev, newSource]);
      toast.success("Optimized screen source added");

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
      if (err.name !== 'NotAllowedError') toast.error("Capture failed");
    }
  }, []);

  const addMicSource = useCallback(async (deviceId?: string) => {
    try {
      const actualDeviceId = typeof deviceId === 'string' ? deviceId : undefined;
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: actualDeviceId ? { exact: actualDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
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
      toast.error("Mic access failed");
    }
  }, []);

  const replaceSourceStream = useCallback(async (id: string, type: 'video' | 'audio', deviceId?: string) => {
    try {
      const actualDeviceId = typeof deviceId === 'string' ? deviceId : undefined;
      let newStream: MediaStream;
      
      if (type === 'video') {
        newStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { frameRate: { ideal: 60 } }, 
          audio: true 
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            deviceId: actualDeviceId ? { exact: actualDeviceId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      }

      newStream.getTracks().forEach(optimizeTrack);

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