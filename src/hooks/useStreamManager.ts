import { useState, useCallback, useEffect } from 'react';
import Peer, { MediaConnection } from 'peerjs';
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

  useEffect(() => {
    const newPeer = new Peer(peerId);
    newPeer.on('open', (id) => {
      console.log('Peer opened with ID:', id);
    });
    newPeer.on('error', (err) => {
      toast.error(`Peer Error: ${err.type}`);
    });
    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [peerId]);

  const addScreenSource = useCallback(async () => {
    try {
      // Requesting both video and audio for system/app sound
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          frameRate: { ideal: 60, max: 60 },
          cursor: "always"
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // These help with high-quality game/app audio
          suppressLocalAudioPlayback: false,
        }
      });
      
      const newSource: StreamSource = {
        id: `video-${Date.now()}`,
        label: "Screen/App Capture",
        type: 'video',
        stream
      };

      setSources(prev => [...prev, newSource]);
      
      // If the user shared audio with the screen, add it as a separate source too
      if (stream.getAudioTracks().length > 0) {
        const audioStream = new MediaStream(stream.getAudioTracks());
        const audioSource: StreamSource = {
          id: `audio-sys-${Date.now()}`,
          label: "System/App Audio",
          type: 'audio',
          stream: audioStream
        };
        setSources(prev => [...prev, audioSource]);
      }

      return newSource;
    } catch (err: any) {
      toast.error(`Capture Failed: ${err.message || 'User cancelled or permission denied'}`);
      console.error("Failed to get display media", err);
    }
  }, []);

  const addMicSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const newSource: StreamSource = {
        id: `audio-mic-${Date.now()}`,
        label: "Microphone Input",
        type: 'audio',
        stream
      };

      setSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err: any) {
      toast.error(`Mic Failed: ${err.message}`);
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