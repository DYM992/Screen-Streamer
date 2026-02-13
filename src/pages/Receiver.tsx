import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Peer from "peerjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface RemoteSource {
  id: string;
  label: string;
  type: "video" | "audio" | string;
  stream: MediaStream;
}

interface RoomData {
  id: string;
  thumbnail?: string;
  is_live: boolean;
  created_at: string;
}

const Receiver = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const room = searchParams.get("room");
  const targetSourceId = searchParams.get("sourceId");

  const [sources, setSources] = useState<RemoteSource[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(targetSourceId || undefined);
  const peerRef = useRef<Peer | null>(null);

  // Live‑rooms list
  const [liveRooms, setLiveRooms] = useState<RoomData[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    // Sync selected source when URL changes
    setSelectedSourceId(targetSourceId || undefined);
  }, [targetSourceId]);

  useEffect(() => {
    if (room) return;
    const fetchLiveRooms = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_live", true)
        .order("created_at", { ascending: false });
      if (!error) setLiveRooms(data as RoomData[]);
      setRoomsLoading(false);
    };
    fetchLiveRooms();
  }, [room]);

  // Single‑room streaming
  useEffect(() => {
    if (!room) return;
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", () => {
      setStatus("connected");
      peer.on("call", (incomingCall) => {
        incomingCall.answer();
        incomingCall.on("stream", (remoteStream) => {
          const metadata = (incomingCall as any).metadata || {};
          const sourceId = metadata.id || `remote-${Date.now()}`;
          const newSource: RemoteSource = {
            id: sourceId,
            label: metadata.label || "Remote Stream",
            type: metadata.type || "video",
            stream: remoteStream,
          };
          setSources((prev) => {
            const existing = prev.findIndex((s) => s.id === sourceId);
            if (existing !== -1) {
              const upd = [...prev];
              upd[existing] = { ...upd[existing], stream: remoteStream };
              return upd;
            }
            return [...prev, newSource];
          });
        });
      });
      // Trigger a dummy call to receive streams from broadcaster
      peer.call(room, new MediaStream());
    });

    peer.on("error", () => setStatus("error"));
    return () => peer.destroy();
  }, [room]);

  const displayedSources = selectedSourceId
    ? sources.filter((s) => s.label === selectedSourceId)
    : sources;

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Live Rooms</h2>
        {roomsLoading ? (
          <p className="text-center">Loading…</p>
        ) : liveRooms.length === 0 ? (
          <p className="text-center text-slate-400">No rooms are currently live.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveRooms.map((roomData) => (
              <Card
                key={roomData.id}
                className="bg-slate-900 border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
                onClick={() => navigate(`/receiver?room=${roomData.id}`)}
              >
                <div className="aspect-video bg-slate-950 relative overflow-hidden">
                  {roomData.thumbnail ? (
                    <img
                      src={roomData.thumbnail}
                      alt={roomData.id}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-slate-600 text-2xl">💡</span>
                    </div>
                  )}
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg text-white">{roomData.id}</CardTitle>
                  <CardDescription className="text-sm text-slate-400">
                    Created: {new Date(roomData.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "error") return null;
  if (status === "connecting") return null;

  return (
    <div className="fixed inset-0 bg-transparent flex flex-col items-center justify-center">
      {/* Source selector */}
      {sources.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 justify-center">
          {sources.map((src) => (
            <Button
              key={src.id}
              variant={selectedSourceId === src.label ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedSourceId(src.label);
                setSearchParams({ room, sourceId: src.label });
              }}
            >
              {src.label}
            </Button>
          ))}
        </div>
      )}

      {/* Render selected sources */}
      {displayedSources.map((source) => (
        <div key={source.id} className={`relative ${source.type === "audio" ? "hidden" : ""} w-full h-full`}>
          {source.type === "audio" ? (
            <audio
              autoPlay
              ref={(el) => {
                if (el && el.srcObject !== source.stream) el.srcObject = source.stream;
              }}
            />
          ) : (
            <video
              autoPlay
              playsInline
              muted={false}
              controls={false}
              ref={(el) => {
                if (el && el.srcObject !== source.stream) el.srcObject = source.stream;
              }}
              className="w-screen h-screen object-fill bg-black"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Receiver;