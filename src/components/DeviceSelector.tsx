import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeviceSelectorProps {
  type: "camera" | "audio";
  selectedDeviceId?: string;
  onChange: (deviceId: string) => void;
}

export const DeviceSelector = ({ type, selectedDeviceId, onChange }: DeviceSelectorProps) => {
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

  return (
    <Select
      onValueChange={(value) => {
        onChange(value);
      }}
      value={selectedDeviceId}
    >
      <SelectTrigger className="h-8 px-2 border rounded">
        <SelectValue placeholder={`Change ${type === "camera" ? "Camera" : "Mic"}`} />
      </SelectTrigger>
      <SelectContent>
        {devices.map(d => (
          <SelectItem key={d.deviceId} value={d.deviceId}>
            {d.label || `${type === "camera" ? "Camera" : "Mic"} ${d.deviceId.slice(0, 6)}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};