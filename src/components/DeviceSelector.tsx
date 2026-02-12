import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeviceSelectorProps {
  type: "camera" | "audio";
  selectedDeviceId?: string;
  onChange: (deviceId: string) => void;
}

export const DeviceSelector = ({ type, selectedDeviceId, onChange }: DeviceSelectorProps) => {
  const [showSelect, setShowSelect] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      const all = await navigator.mediaDevices.enumerateDevices();
      const filtered = all.filter(d => {
        if (type === "camera") return d.kind === "videoinput";
        return d.kind === "audioinput";
      });
      setDevices(filtered);
    };
    fetchDevices();
  }, [type]);

  const toggleSelect = () => setShowSelect(prev => !prev);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={toggleSelect}
        className="h-8 px-2"
      >
        Change {type === "camera" ? "Camera" : "Mic"}
      </Button>

      {showSelect && (
        <Select
          onValueChange={(value) => {
            onChange(value);
            setShowSelect(false);
          }}
          value={selectedDeviceId}
        >
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder={type === "camera" ? "Select Camera" : "Select Mic"} />
          </SelectTrigger>
          <SelectContent>
            {devices.map(d => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label || `${type === "camera" ? "Camera" : "Mic"} ${d.deviceId.slice(0, 6)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};