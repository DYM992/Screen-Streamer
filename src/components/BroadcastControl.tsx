import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { useStreamManager } from "@/hooks/useStreamManager";

interface BroadcastControlProps {
  roomId: string;
}

export const BroadcastControl = ({ roomId }: BroadcastControlProps) => {
  const {
    isBroadcasting,
    toggleBroadcasting,
    reconnectAll,
  } = useStreamManager(roomId);

  const handleToggle = async () => {
    if (isBroadcasting) {
      await toggleBroadcasting(); // stop
    } else {
      await toggleBroadcasting(); // start
      // Activate any enabled sources after broadcast starts
      await reconnectAll();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={`h-8 w-8 rounded-full transition-all ${
        isBroadcasting
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white"
      }`}
    >
      {isBroadcasting ? (
        <Square className="w-3 h-3 fill-current" />
      ) : (
        <Play className="w-3 h-3 fill-current" />
      )}
    </Button>
  );
};