import { useState, useEffect } from 'react';
import { useStreamManager } from '@/hooks/useStreamManager';
import SourceCard from '@/components/SourceCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const Broadcaster = () => {
  const [roomName, setRoomName] = useState(`room-${Math.floor(Math.random() * 1000)}`);
  const { peer, sources, addScreenSource, addMicSource, removeSource } = useStreamManager(roomName);
  const [copied, setCopied] = useState(false);

  const receiverUrl = `${window.location.origin}/receiver?room=${roomName}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(receiverUrl);
    setCopied(true);
    toast.success("Receiver URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!peer) return;

    peer.on('call', (call) => {
      // When a receiver connects, we send them ALL current sources
      // In a real app, we might want to negotiate which sources they want
      sources.forEach(source => {
        peer.call(call.peer, source.stream, {
          metadata: { id: source.id, label: source.label, type: source.type }
        });
      });
    });
  }, [peer, sources]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              StreamSync Broadcaster
            </h1>
            <p className="text-slate-400">Stream high-quality video and audio over your LAN.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <Label htmlFor="room" className="text-xs text-slate-500 uppercase font-bold">Room ID</Label>
              <div className="flex gap-2">
                <Input 
                  id="room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="h-9 bg-slate-950 border-slate-800 w-40"
                />
                <Button size="sm" variant="secondary" onClick={copyToClipboard} className="h-9">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Active Sources
                <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {sources.length}
                </span>
              </h2>
              <div className="flex gap-2">
                <Button onClick={addScreenSource} variant="outline" className="gap-2 border-indigo-500/30 hover:bg-indigo-500/10">
                  <Plus className="w-4 h-4" /> Add Screen
                </Button>
                <Button onClick={addMicSource} variant="outline" className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10">
                  <Plus className="w-4 h-4" /> Add Mic
                </Button>
              </div>
            </div>

            {sources.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-4">
                <Share2 className="w-12 h-12 opacity-20" />
                <p>No active sources. Add a screen or microphone to start streaming.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sources.map(source => (
                  <SourceCard key={source.id} source={source} onRemove={removeSource} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <h3 className="font-semibold mb-4">OBS Setup Guide</h3>
              <ol className="space-y-4 text-sm text-slate-400 list-decimal list-inside">
                <li>Open OBS on your receiving computer.</li>
                <li>Add a new <span className="text-indigo-400 font-medium">Browser Source</span>.</li>
                <li>Paste the Receiver URL from the top right.</li>
                <li>Set width/height to match your stream (e.g., 1920x1080).</li>
                <li>Check <span className="text-indigo-400 font-medium">"Control audio via OBS"</span> if you want to mix audio separately.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Broadcaster;