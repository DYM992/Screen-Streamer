import { useState } from 'react';
import { useStreamManager } from '@/hooks/useStreamManager';
import SourceCard from '@/components/SourceCard';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Monitor, Mic, Settings2, LayoutGrid, Info } from "lucide-react";

const Broadcaster = () => {
  const [roomName, setRoomName] = useState(`stream-${Math.floor(Math.random() * 1000)}`);
  const { 
    sources, 
    connections, 
    addScreenSource, 
    addMicSource, 
    updateSourceLabel, 
    removeSource,
    replaceSourceStream 
  } = useStreamManager(roomName);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
        
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <LayoutGrid className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">StreamSync<span className="text-indigo-500">.</span></h1>
            </div>
            <p className="text-slate-400 font-medium max-w-md">
              Low-latency multi-source broadcasting for professional OBS workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-4 pr-4">
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <Label className="text-[10px] text-slate-500 uppercase font-black block mb-1">Room ID</Label>
                <input 
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-mono w-32 p-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-400">{connections} Receivers</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
          <div className="xl:col-span-3 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                Live Sources
                <span className="text-sm bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-800">
                  {sources.length}
                </span>
              </h2>
              <div className="flex gap-3">
                <Button onClick={() => addScreenSource()} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-6 h-12">
                  <Monitor className="w-4 h-4 mr-2" /> Add Screen
                </Button>
                <Button onClick={() => addMicSource()} variant="outline" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-6 h-12">
                  <Mic className="w-4 h-4 mr-2" /> Add Mic
                </Button>
              </div>
            </div>

            {sources.length === 0 ? (
              <div className="aspect-[21/9] border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-500 gap-6 bg-slate-900/10">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center rotate-3">
                  <Settings2 className="w-10 h-10 opacity-20" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-bold text-slate-300">Ready to broadcast</p>
                  <p className="text-sm text-slate-500">Add your first source to generate receiver links.</p>
                </div>
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
                    onUpdateStream={replaceSourceStream}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-3 text-indigo-400">
                <Info className="w-5 h-5" />
                <h3 className="font-bold">Pro Tips</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-black text-indigo-500/50 uppercase tracking-widest">OBS Separation</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Click the <span className="text-slate-200">link icon</span> on any source to copy a unique URL. Add each as a separate Browser Source in OBS to mix them individually.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black text-indigo-500/50 uppercase tracking-widest">Audio Quality</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Enable "Control audio via OBS" in the Browser Source properties to use OBS's built-in filters and mixers.
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