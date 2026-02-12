import { useState, useEffect } from 'react';
import { useStreamManager } from '@/hooks/useStreamManager';
import SourceCard from '@/components/SourceCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Share2, Copy, Check, Monitor, Mic } from "lucide-react";
import { toast } from "sonner";

const Broadcaster = () => {
  const [roomName, setRoomName] = useState(`room-${Math.floor(Math.random() * 1000)}`);
  const { peer, sources, addScreenSource, addMicSource, removeSource } = useStreamManager(roomName);
  const [copied, setCopied] = useState(false);

  const receiverUrl = `${window.location.origin}/receiver?room=${roomName}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(receiverUrl);
    setCopied(true);
    toast.success("Receiver URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!peer) return;

    peer.on('call', (call) => {
      sources.forEach(source => {
        peer.call(call.peer, source.stream, {
          metadata: { id: source.id, label: source.label, type: source.type }
        });
      });
    });
  }, [peer, sources]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              STREAMSYNC
            </h1>
            <p className="text-slate-400 font-medium">High-performance LAN broadcasting</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="space-y-1.5">
              <Label htmlFor="room" className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Room Identifier</Label>
              <div className="flex gap-2">
                <Input 
                  id="room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 w-48 text-white font-mono"
                />
                <Button 
                  variant="secondary" 
                  onClick={copyToClipboard} 
                  className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white border-none"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 mr-2" />}
                  <span className="font-bold">{copied ? "Copied" : "Copy Link"}</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                Active Sources
                <span className="bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-full">
                  {sources.length}
                </span>
              </h2>
              <div className="flex gap-3">
                <Button 
                  onClick={addScreenSource} 
                  className="bg-white text-slate-950 hover:bg-slate-200 font-bold px-6"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Add Screen/App
                </Button>
                <Button 
                  onClick={addMicSource} 
                  variant="outline" 
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 font-bold px-6"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Add Mic
                </Button>
              </div>
            </div>

            {sources.length === 0 ? (
              <div className="h-80 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 gap-6 bg-slate-900/20">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center">
                  <Share2 className="w-10 h-10 opacity-20" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-slate-400">No active streams</p>
                  <p className="text-sm max-w-xs mx-auto">Click the buttons above to capture your screen or microphone to begin.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {sources.map(source => (
                  <SourceCard key={source.id} source={source} onRemove={removeSource} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-indigo-600/10 rounded-3xl p-8 border border-indigo-500/20">
              <h3 className="text-xl font-bold mb-6 text-indigo-300">OBS Integration</h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">1</div>
                  <p className="text-sm text-slate-300 leading-relaxed">Open OBS on your target PC and add a <strong>Browser Source</strong>.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">2</div>
                  <p className="text-sm text-slate-300 leading-relaxed">Paste the <strong>Receiver URL</strong> and set your desired resolution.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">3</div>
                  <p className="text-sm text-slate-300 leading-relaxed">Enable <strong>"Control audio via OBS"</strong> to mix each source independently.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Broadcaster;