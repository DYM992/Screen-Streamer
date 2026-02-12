import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Mic, Trash2, Activity } from "lucide-react";
import { StreamSource } from "@/hooks/useStreamManager";

interface SourceCardProps {
  source: StreamSource;
  onRemove: (id: string) => void;
}

const SourceCard = ({ source, onRemove }: SourceCardProps) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && source.type === 'video') {
      videoRef.current.srcObject = source.stream;
    }
  }, [source]);

  return (
    <Card className="overflow-hidden border-2 border-indigo-500/20 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {source.type === 'video' ? <Monitor className="w-4 h-4 text-indigo-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          {source.label}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRemove(source.id)}
          className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
          {source.type === 'video' ? (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400">Audio Stream Active</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Live</span>
          <span className="text-[10px] text-slate-600 ml-auto font-mono">{source.id}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceCard;