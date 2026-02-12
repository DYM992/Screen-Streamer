import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Tv, ShieldCheck, History, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [recentRooms, setRecentRooms] = useState<string[]>([]);

  useEffect(() => {
    const rooms = JSON.parse(localStorage.getItem('streamsync_rooms') || '[]');
    setRecentRooms(rooms);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black tracking-tighter text-white">
            Stream<span className="text-indigo-500">Sync</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Professional-grade LAN streaming. Zero latency, multiple sources, 
            and perfect OBS integration.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-slate-900 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group" onClick={() => navigate('/broadcaster')}>
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Radio className="text-indigo-500 w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">Broadcaster</CardTitle>
              <CardDescription className="text-slate-400">
                Capture your screen, camera, and microphones to stream to other devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 font-bold rounded-xl">Start Broadcasting</Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group" onClick={() => navigate('/receiver')}>
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Tv className="text-emerald-500 w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">Receiver</CardTitle>
              <CardDescription className="text-slate-400">
                Receive streams for monitoring or to use as a browser source in OBS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-12 font-bold rounded-xl">Open Receiver</Button>
            </CardContent>
          </Card>
        </div>

        {recentRooms.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 px-2">
              <History className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Recent Rooms</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentRooms.map(room => (
                <div 
                  key={room}
                  onClick={() => navigate(`/broadcaster?room=${room}`)}
                  className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-900 hover:border-indigo-500/30 transition-all cursor-pointer group"
                >
                  <span className="font-mono text-slate-300">{room}</span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-8 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>LAN Optimized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;