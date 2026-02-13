import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, ArrowRight, RefreshCw } from "lucide-react";
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

  // Trigger fade‑in after data loads
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

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2 transition-opacity duration-300 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {sources.map((src) => (
        <Card
          key={src.id}
          className="bg-slate-900 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group p-2"
        >
          <CardHeader className="p-2">
            <CardTitle className="text-base font-bold text-white">{src.label}</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {src.type.charAt(0).toUpperCase() + src.type.slice(1)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => navigate(`/receiver?room=${roomId}&sourceId=${src.id}`)}
            >
              <ArrowRight className="w-3 h-3" />
              View
            </Button>
            {src.is_enabled ? (
              <span className="text-xs text-emerald-500 font-medium">Enabled</span>
            ) : (
              <span className="text-xs text-rose-500 font-medium">Disabled</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};