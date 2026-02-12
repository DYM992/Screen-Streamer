import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeviceSelectorProps {
  type: "camera" | "audio";
  selectedDeviceId?: string;
  onChange: (deviceId: string) => void;
}

export const DeviceSelector = ({
  type,
  selectedDeviceId,
  onChange,
}: DeviceSelectorProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      const all = await navigator.mediaDevices.enumerateDevices();
      const filtered = all.filter((d) => {
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
      {/* Trigger is the RefreshCw icon button */}
      <SelectTrigger className="h-8 w-8 p-2 flex items-center justify-center border rounded">
        <RefreshCw className="w-4 h-4" />
      </SelectTrigger>
      <SelectContent>
        {devices.map((d) => (
          <SelectItem key={d.deviceId} value={d.deviceId}>
            {d.label ||
              `${type === "camera" ? "Camera" : "Mic"} ${d.deviceId.slice(
                0,
                6
              )}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};