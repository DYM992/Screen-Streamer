import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Monitor, Mic, Camera, Trash2, Edit2, Check, ExternalLink, Settings, 
  RefreshCw
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { StreamSource } from "@/hooks/useStreamManager";
import { toast } from "sonner";

interface SourceCardProps {
  source: StreamSource;
  roomName: string;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onUpdateStream: (id: string, type: 'video' | 'audio' | 'camera', deviceId?: string) => Promise<void>;
}

const SourceCard = ({ source, roomName, onRemove, onRename, onUpdateStream }: SourceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(source.label);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>(source.deviceId || "");
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && (source.type === 'video' || source.type === 'camera')) {
      videoRef.current.srcObject = source.stream;
    }
  }, [source.stream, source.type]);

  useEffect(() => {
    if (source.type === 'audio' || source.type === 'camera') {
      navigator.mediaDevices.enumerateDevices().then(d => {
        setDevices(d.filter(device => 
          source.type === 'audio' ? device.kind === 'audioinput' : device.kind === 'videoinput'
        ));
      });
    }
  }, [source.type]);

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
    <Card className="overflow-hidden border-2 border-indigo-500/20 bg-slate-900/80 backdrop-blur-xl transition-all hover:border-indigo-500/40 group">
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
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-indigo-500" />
                  Source Settings: {source.label}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-6 space-y-6">
                {source.type !== 'video' ? (
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Select Device</label>
                    <Select onValueChange={setSelectedDevice} defaultValue={selectedDevice}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                        <SelectValue placeholder="Choose a device..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {devices.map(device => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `${source.type === 'audio' ? 'Mic' : 'Camera'} ${device.deviceId.slice(0, 5)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" 
                      onClick={() => onUpdateStream(source.id, source.type, selectedDevice)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Update Device
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" 
                      onClick={() => onUpdateStream(source.id, 'video')}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Re-select Capture Source
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

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
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceCard;