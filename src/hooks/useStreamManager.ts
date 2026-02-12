import { useState, useCallback, useEffect } from 'react';
import Peer, { MediaConnection } from 'peerjs';

export interface StreamSource {
  id: string;
  label: string;
  type: 'video' | 'audio';
  stream: MediaStream;
}

export const useStreamManager = (peerId?: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [connections, setConnections] = useState<MediaConnection[]>([]);

  useEffect(() => {
    const newPeer = new Peer(peerId);
    newPeer.on('open', (id) => {
      console.log('Peer opened with ID:', id);
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
      
      const newSource: StreamSource = {
        id: `video-${Date.now()}`,
        label: "Desktop/App Video",
        type: 'video',
        stream
      };

      setSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err) {
      console.error("Failed to get display media", err);
    }
  }, []);

  const addMicSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      const newSource: StreamSource = {
        id: `audio-${Date.now()}`,
        label: "Microphone/Input",
        type: 'audio',
        stream
      };

      setSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err) {
      console.error("Failed to get audio media", err);
    }
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources(prev => {
      const source = prev.find(s => s.id === id);
      if (source) {
        source.stream.getTracks().forEach(track => track.stop());
      }
      return prev.filter(s => s.id !== id);
    });
  }, []);

  return {
    peer,
    sources,
    addScreenSource,
    addMicSource,
    removeSource
  };
};