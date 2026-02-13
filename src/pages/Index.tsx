import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Radio, Tv, ShieldCheck, History, ArrowRight, Plus, Trash2, Monitor, Play, Square, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RoomData {
  id: string;
  thumbnail?: string;
  is_live: boolean;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();

    // Subscribe to room changes for real‑time live status
    const channel = supabase
      .channel('room-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setRooms(data || []);
    }
    setIsLoading(false);
  };

  const deleteRoom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) {
      setRooms(prev => prev.filter(r => r.id !== id));
      toast.success("Room deleted");
    }
  };

  const toggleRoomLive = async (room: RoomData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (room.is_live) {
      await supabase.from('rooms').update({ is_live: false }).eq('id', room.id);
      toast.info(`Room ${room.id} stopped`);
    } else {
      navigate(`/broadcaster?room=${room.id}&autoStart=true`);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) {
      toast.error("Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative">
      {/* Login button that opens a dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            Login
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>Please sign in to continue.</DialogDescription>
          </DialogHeader>
          {/* Google login button */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-100"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </Button>
        </DialogContent>
      </Dialog>

      <div className="max-w-6xl w-full space-y-12 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-black tracking-tighter text-white">
            Screen <span className="text-indigo-500">Streamer</span>
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

          <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group overflow-hidden relative" onClick={() => navigate('/live')}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative z-10">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Tv className="text-emerald-500 w-7 h-7" />
              </div>
              <CardTitle className="text-3xl text-white">Live Rooms</CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                View and join rooms that are currently streaming.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-14 text-lg font-black rounded-2xl">
                View Live
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => toggleRoomLive(room, e)}
                          className={`h-8 w-8 rounded-full transition-all ${
                            room.is_live 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'bg-emerald-500/10 text-emerald-500 hover-bg-emerald-500 hover:text-white'
                          }`}
                        >
                          {room.is_live ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteRoom(room.id, e)}
                          className="h-8 w-8 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
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