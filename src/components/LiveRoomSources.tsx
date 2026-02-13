import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Monitor, Camera, Mic, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Source {
  id: string;
  label: string;
  type: "video" | "audio" | "camera";
  is_enabled: boolean;
}

interface Props {
  roomId: string;
}

export const LiveRoomSources = ({ roomId }: Props) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  const fetchSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("room_id", roomId);
    if (!error && data) setSources(data as Source[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, [roomId]);

  // fade‑in after load – slower, smoother
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="animate-spin w-6 h-6 text-indigo-500" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-center text-slate-400 py-4">
        No sources available for this room.
      </div>
    );
  }

  const getIcon = (type: string) => {
    if (type === "video") return <Monitor className="w-4 h-4" />;
    if (type === "camera") return <Camera className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2 transition-opacity duration-600 ease-in-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {sources.map((src) => (
        <Card
          key={src.id}
          className={`flex items-center p-2 h-20 ${
            src.is_enabled
              ? "bg-emerald-500/20 border-emerald-500"
              : "bg-slate-900 border-slate-800"
          } border rounded-lg transition-colors cursor-pointer`}
          onClick={() => navigate(`/receiver?room=${roomId}&sourceId=${src.id}`)}
        >
          <div className="flex items-center gap-2 mr-2">
            {getIcon(src.type)}
            <CardTitle className="text-sm font-medium text-white">{src.label}</CardTitle>
          </div>
        </Card>
      ))}
    </div>
  );
};