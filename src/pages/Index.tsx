import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Tv, ShieldCheck, History, ArrowRight, Plus, Trash2, Monitor } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers"

interface RoomData {
  id: string;
  thumbnail?: string;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load rooms");
    } else {
      setRooms(data || []);
    }
    setIsLoading(false);
  };

  const deleteRoom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    
    if (error) {
      toast.error("Failed to delete room");
    } else {
      setRooms(prev => prev.filter(r => r.id !== id));
      toast.success("Room deleted");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full space-y-12 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-black tracking-tighter text-white">
            Stream<span className="text-indigo-500">Sync</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Professional-grade LAN streaming. Zero latency, multiple sources, 
            and perfect OBS integration.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-slate-900 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group overflow-hidden relative" onClick={() => navigate('/broadcaster')}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative z-10">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Radio className="text-indigo-500 w-7 h-7" />
              </div>
              <CardTitle className="text-3xl text-white">Broadcaster</CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                Create a new room and manage your live sources.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-black rounded-2xl shadow-lg shadow-indigo-500/20">
                <Plus className="w-6 h-6 mr-2" /> Create Room
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group overflow-hidden relative" onClick={() => navigate('/receiver')}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative z-10">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Tv className="text-emerald-500 w-7 h-7" />
              </div>
              <CardTitle className="text-3xl text-white">Receiver</CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                Join an existing room to monitor or capture streams.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-14 text-lg font-black rounded-2xl">
                Open Receiver
              </Button>
            </CardContent>
          </Card>
        </div>

        {!isLoading && rooms.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3 text-slate-400">
                <History className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Your Saved Rooms</h3>
              </div>
              <span className="text-xs font-bold text-slate-600">{rooms.length} Rooms Total</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => navigate(`/broadcaster?room=${room.id}`)}
                  className="group bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-indigo-500/40 transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-video bg-slate-950 relative overflow-hidden">
                    {room.thumbnail ? (
                      <img src={room.thumbnail} alt={room.id} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
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
                        onClick={(e) => deleteRoom(room.id, e)}
                        className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-12 text-slate-500 text-sm font-bold">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500/50" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span>LAN Optimized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;