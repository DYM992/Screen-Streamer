import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface WebMRecorderProps {
  stream: MediaStream;
  /** Optional filename without extension */
  filename?: string;
}

/**
 * Records the provided MediaStream using MediaRecorder (WebM format)
 * and offers a download button once recording stops.
 * Recording starts automatically when the component mounts and stops
 * when the stream ends or the component unmounts.
 */
export const WebMRecorder = ({ stream, filename = "recording" }: WebMRecorderProps) => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    // Ensure the browser supports MediaRecorder with WebM
    if (!MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
      console.warn("WebM (vp8) not supported in this browser.");
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 2_500_000,
    });

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    };

    recorder.start();

    // Stop recording when the stream ends
    const stopHandler = () => recorder.stop();
    stream.getTracks().forEach((t) => t.addEventListener("ended", stopHandler));

    return () => {
      recorder.stop();
      stream.getTracks().forEach((t) => t.removeEventListener("ended", stopHandler));
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  if (!downloadUrl) {
    return <p className="text-xs text-gray-400">Recording…</p>;
  }

  return (
    <a
      href={downloadUrl}
      download={`${filename}.webm`}
      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-200"
    >
      <Download className="w-3 h-3" />
      Download WebM
    </a>
  );
};