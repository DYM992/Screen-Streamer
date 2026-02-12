import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Monitor,
  Mic,
  Camera,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { StreamSource } from "@/hooks/useStreamManager";
import { toast } from "sonner";
import { DeviceSelector } from "./DeviceSelector";

interface SourceCardProps {
  source: StreamSource;
  roomName: string;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onActivate: (id: string) => Promise<boolean | undefined>;
  onDeactivate: (id: string) => void;
  onDeviceChange: (id: string, deviceId: string) => void;
}

const SourceCard = ({
  source,
  roomName,
  onRemove,
  onRename,
  onActivate,
  onDeactivate,
  onDeviceChange,
}: SourceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(source.label);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && source.stream && (source.type === "video" || source.type === "camera")) {
      videoRef.current.srcObject = source.stream;
    }
  }, [source.stream, source.isActive]);

  const handleRename = () => {
    onRename(source.id, label);
    setIsEditing(false);
  };

  const toggleVisibility = () => {
    if (source.isActive) {
      onDeactivate(source.id);
    } else {
      onActivate(source.id);
    }
  };

  const copyObsUrl = () => {
    const url = `${window.location.origin}/receiver?room=${roomName}&sourceId=${source.id}`;
    navigator.clipboard.writeText(url);
    toast.success(`OBS URL for ${source.label} copied!`);
  };

  const getIcon = () => {
    if (source.type === "video") return <Monitor className="w-4 h-4 text-indigo-400" />;
    if (source.type === "camera") return <Camera className="w-4 h-4 text-pink-400" />;
    return <Mic className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <Card
      className={`overflow-hidden border-2 transition-all group ${
        source.isActive
          ? "border-indigo-500/20 bg-slate-900/80"
          : "border-slate-800 bg-slate-900/40 grayscale opacity-60"
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-1 mr-2">
          {getIcon()}
          {isEditing ? (
            <div className="flex gap-1 flex-1 items-center">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-7 text-xs bg-slate-950 border-slate-800 text-white"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-emerald-500"
                onClick={handleRename}
              >
                <Check className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <CardTitle className="text-sm font-bold truncate max-w-[120px] text-slate-100 self-center">
              {source.label}
            </CardTitle>
          )}
          {!isEditing && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white self-center"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="flex gap-1 items-center ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVisibility}
            className={`h-8 w-8 ${source.isActive ? "text-indigo-400" : "text-slate-500"}`}
            title={source.isActive ? "Disable Source" : "Enable Source"}
          >
            {source.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyObsUrl}
            className="h-8 w-8 text-slate-400 hover:text-indigo-400"
            title="Copy OBS Source URL"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(source.id)}
            className="h-8 w-8 text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          {!source.isActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-sm">
              <EyeOff className="w-8 h-8 text-slate-700" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Disabled
              </p>
            </div>
          ) : (
            <>
              {source.type !== "audio" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-auto max-h-48 object-contain bg-black rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-950/50">
                  <div className="flex gap-1 items-end h-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-emerald-500 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Audio Active
                  </span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onActivate(source.id)}
                  className="h-8 w-8 bg-black/50 backdrop-blur-md text-white hover:bg-black/80 rounded-full"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        {(source.type === "camera" || source.type === "audio") && (
          <div className="mt-2">
            <DeviceSelector
              type={source.type as any}
              selectedDeviceId={source.deviceId}
              onChange={(deviceId) => onDeviceChange(source.id, deviceId)}
            />
          </div>
        )}

        {source.type === "video" && (
          <div className="mt-2">
            <Select
              onValueChange={async () => {
                await onActivate(source.id);
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select video source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screen">Screen / Window / Tab</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourceCard;