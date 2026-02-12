import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Monitor, Camera, Mic } from "lucide-react";

export type SourceOption = "video" | "camera" | "audio";

interface Props {
  value: SourceOption;
  onChange: (val: SourceOption) => void;
}

export const SourceTypeSelector = ({ value, onChange }: Props) => {
  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger className="h-10 w-48">
        <SelectValue placeholder="Select source type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="video">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-indigo-400" />
            <span>Screen</span>
          </div>
        </SelectItem>
        <SelectItem value="camera">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-pink-400" />
            <span>Camera</span>
          </div>
        </SelectItem>
        <SelectItem value="audio">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Microphone</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};