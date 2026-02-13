import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Play, Square, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveRoom {
  id: string;
  thumbnail?: string;
  is_live: boolean;
  created_at: string;
}

const LiveRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);

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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full space-y-8 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Live Rooms
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Rooms that are currently broadcasting. Click to join as a receiver.
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            No live rooms at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <Card
                key={room.id}
                className="bg-slate-900 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group overflow-hidden relative"
                onClick={() => navigate(`/receiver?room=${room.id}`)}
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
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <span className="font-mono text-white font-bold text-sm bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                      {room.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-slate-800/50 text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg font-bold text-white">
                    {room.id}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-400">
                    Created: {new Date(room.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-10 text-base font-black rounded-2xl"
                  >
                    Join
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveRooms;