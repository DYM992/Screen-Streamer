import { useState, useCallback, useEffect, useRef } from "react";
import Peer from "peerjs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface StreamSource {
  id: string;
  dbId?: string;
  label: string;
  type: "video" | "audio" | "camera";
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
  const [fps, setFps] = useState<number>(30); // default FPS

  const sourcesRef = useRef<StreamSource[]>([]);
  const isBroadcastingRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    sourcesRef.current = sources;
    isBroadcastingRef.current = isBroadcasting;
  }, [sources, isBroadcasting]);

  // Load room and sources from Supabase, scoped to current user
  useEffect(() => {
    const loadRoom = async () => {
      if (!roomName) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Load room
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomName)
        .single();

      if (!room) {
        // Insert room with user_id if available
        await supabase
          .from("rooms")
          .insert({ id: roomName, user_id: user?.id });
      }

      const { data: dbSources } = await supabase
        .from("sources")
        .select("*")
        .eq("room_id", roomName);

      if (dbSources) {
        const mappedSources: StreamSource[] = dbSources.map(s => ({
          id: s.id,
          dbId: s.id,
          label: s.label,
          type: s.type as any,
          deviceId: s.device_id,
          isEnabled: s.is_enabled,
          isActive: false,
        }));
        setSources(mappedSources);

        // Auto‑activate enabled sources (except screen share)
        mappedSources.forEach(s => {
          if (s.isEnabled && s.type !== "video") {
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
      .from("rooms")
      .update({ is_live: isBroadcastingRef.current })
      .eq("id", roomName);

    // Update sources
    for (const source of sourcesRef.current) {
      if (source.dbId) {
        await supabase
          .from("sources")
          .update({
            label: source.label,
            is_enabled: source.isEnabled,
            device_id: source.deviceId,
            type: source.type,
          })
          .eq("id", source.dbId);
      }
    }
  }, [roomName]);

  // ... rest of the hook unchanged ...

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