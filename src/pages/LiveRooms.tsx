import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LiveRoomSources } from "@/components/LiveRoomSources";

interface LiveRoom {
  id: string;
  thumbnail?: string;
  is_live: boolean;
  created_at: string;
}

const LiveRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const fetchLiveRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_live", true)
      .order("created_at", { ascending: false });

    if (!error) setRooms(data || []);
  };

  useEffect(() => {
    fetchLiveRooms();

    const channel = supabase
      .channel("live-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, fetchLiveRooms)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleExpand = (roomId: string) => {
    setExpandedRoom(prev => (prev === roomId ? null : roomId));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full space-y-8 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Live Rooms
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Rooms that are currently broadcasting. Click a room to see its sources.
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            No live rooms at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div key={room.id}>
                <Card
                  className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-indigo-500/40 transition-all cursor-pointer flex flex-col"
                  onClick={() => toggleExpand(room.id)}
                >
                  <div className="aspect-video bg-slate-950 relative overflow-hidden">
                    {room.thumbnail ? (
                      <img
                        src={room.thumbnail}
                        alt={room.id}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Monitor className="w-12 h-12 text-slate-800" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                    
                    {/* Live Badge */}
                    {room.is_live && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full shadow-lg shadow-red-500/20">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <span className="font-mono text-white font-bold text-sm bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        {room.id}
                      </span>
                      <div className="flex gap-2">
                        {/* Arrow button to go to receiver */}
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); navigate(`/broadcaster?room=${room.id}`); }}
                          className="h-8 w-8 bg-emerald-500/10 text-emerald-500 hover-bg-emerald-500 hover:text-white rounded-full transition-all"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Active</p>
                      <p className="text-xs text-slate-300 font-bold">
                        {new Date(room.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>

                {/* Expanded source list – use the new smooth slide‑down animation */}
                {expandedRoom === room.id && (
                  <Card
                    className="mt-2 bg-slate-800 border-slate-700 w-full overflow-hidden animate-slide-down"
                  >
                    <CardHeader className="p-2">
                      <CardTitle className="text-sm font-medium text-white">
                        Sources for {room.id}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <LiveRoomSources roomId={room.id} />
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveRooms;