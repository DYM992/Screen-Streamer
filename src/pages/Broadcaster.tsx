import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStreamManager } from '@/hooks/useStreamManager';
import SourceCard from '@/components/SourceCard';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Monitor, Mic, Camera, LayoutGrid, Info, ArrowLeft, Play, Square } from "lucide-react";

const Broadcaster = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialRoom = searchParams.get('room') || `room-${Math.floor(Math.random() * 1000)}`;
  const [roomName, setRoomName] = useState(initialRoom);

  useEffect(() => {
    if (!searchParams.get('room')) {
      setSearchParams({ room: roomName }, { replace: true });
    }
  }, []);

  const handleRoomChange = (newRoom: string) => {
    setRoomName(newRoom);
    setSearchParams({ room: newRoom }, { replace: true });
  };

  const { 
    sources, 
    connections, 
    isBroadcasting,
    toggleBroadcasting,
    addSource,
    activateSource,
    updateSourceLabel, 
    removeSource
  } = useStreamManager(roomName);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
        
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <LayoutGrid className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">Broadcaster<span className="text-indigo-500">.</span></h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-4 pr-4">
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <Label className="text-[10px] text-slate-500 uppercase font-black block mb-1">Room ID</Label>
                <input 
                  value={roomName}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  disabled={isBroadcasting}
                  className="bg-transparent border-none focus:ring-0 text-sm font-mono w-32 p-0 disabled:opacity-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-xs font-bold text-slate-400">{connections} Receivers</span>
              </div>
            </div>

            <Button 
              onClick={toggleBroadcasting}
              className={`h-14 px-8 rounded-2xl font-black text-lg transition-all ${
                isBroadcasting 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {isBroadcasting ? (
                <><Square className="w-5 h-5 mr-2 fill-current" /> Stop Broadcast</>
              ) : (
                <><Play className="w-5 h-5 mr-2 fill-current" /> Start Broadcast</>
              )}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
          <div className="xl:col-span-3 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                Live Sources
                <span className="text-sm bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-800">
                  {sources.length}
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => addSource('video')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl h-11">
                  <Monitor className="w-4 h-4 mr-2" /> Add Screen
                </Button>
                <Button onClick={() => addSource('camera')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl h-11">
                  <Camera className="w-4 h-4 mr-2" /> Add Camera
                </Button>
                <Button onClick={() => addSource('audio')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl h-11">
                  <Mic className="w-4 h-4 mr-2" /> Add Mic
                </Button>
              </div>
            </div>

            {sources.length === 0 ? (
              <div className="aspect-[21/9] border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-500 gap-6 bg-slate-900/10">
                <p className="text-xl font-bold text-slate-300">No sources added</p>
                <p className="text-sm text-slate-500">Add your first source to begin configuring your room.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sources.map(source => (
                  <SourceCard 
                    key={source.id} 
                    source={source} 
                    roomName={roomName}
                    onRemove={removeSource} 
                    onRename={updateSourceLabel}
                    onUpdateStream={() => activateSource(source.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-3 text-indigo-400">
                <Info className="w-5 h-5" />
                <h3 className="font-bold">Room Status</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-black text-indigo-500/50 uppercase tracking-widest">Visibility</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {isBroadcasting 
                      ? "Your room is currently LIVE. Receivers can connect using your Room ID." 
                      : "Your room is OFFLINE. Configure your sources before going live."}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black text-indigo-500/50 uppercase tracking-widest">Persistence</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Source labels and types are saved. You'll just need to re-activate hardware access when you return.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Broadcaster;