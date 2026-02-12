import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Monitor, Mic, Camera, Trash2, Edit2, Check, ExternalLink, Settings, 
  RefreshCw, PlayCircle
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { StreamSource } from "@/hooks/useStreamManager";
import { toast } from "sonner";

interface SourceCardProps {
  source: StreamSource;
  roomName: string;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onUpdateStream: (id: string) => Promise<void>;
}

const SourceCard = ({ source, roomName, onRemove, onRename, onUpdateStream }: SourceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(source.label);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && source.stream && (source.type === 'video' || source.type === 'camera')) {
      videoRef.current.srcObject = source.stream;
    }
  }, [source.stream, source.type]);

  const handleRename = () => {
    onRename(source.id, label);
    setIsEditing(false);
  };

  const copyObsUrl = () => {
    const url = `${window.location.origin}/receiver?room=${roomName}&sourceId=${source.id}`;
    navigator.clipboard.writeText(url);
    toast.success(`OBS URL for ${source.label} copied!`);
  };

  const getIcon = () => {
    if (source.type === 'video') return <Monitor className="w-4 h-4 text-indigo-400" />;
    if (source.type === 'camera') return <Camera className="w-4 h-4 text-pink-400" />;
    return <Mic className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <Card className={`overflow-hidden border-2 transition-all group ${
      source.isReady ? 'border-indigo-500/20 bg-slate-900/80' : 'border-slate-800 bg-slate-900/40 grayscale'
    }`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-1 mr-2">
          {getIcon()}
          {isEditing ? (
            <div className="flex gap-1 flex-1">
              <Input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)}
                className="h-7 text-xs bg-slate-950 border-slate-800 text-white"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={handleRename}>
                <Check className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <CardTitle className="text-sm font-bold truncate max-w-[120px] text-slate-100">
              {source.label}
            </CardTitle>
          )}
          {!isEditing && (
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={copyObsUrl} className="h-8 w-8 text-slate-400 hover:text-indigo-400" title="Copy OBS Source URL">
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onRemove(source.id)} className="h-8 w-8 text-slate-400 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          {!source.isReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/80 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Offline</p>
              <Button 
                onClick={() => onUpdateStream(source.id)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full h-10 px-6 font-bold"
              >
                <PlayCircle className="w-4 h-4 mr-2" /> Activate
              </Button>
            </div>
          ) : (
            <>
              {source.type !== 'audio' ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-950/50">
                  <div className="flex gap-1 items-end h-8">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-1.5 bg-emerald-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Audio Active</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onUpdateStream(source.id)}
                  className="h-8 w-8 bg-black/50 backdrop-blur-md text-white hover:bg-black/80 rounded-full"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceCard;