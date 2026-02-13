import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const MagicLinkForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      // Show generic error message
      toast.error(error.message);
    } else {
      toast.success("Check your inbox for the magic link!");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={sendMagicLink} className="space-y-3">
      <Input
        placeholder="your@email.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-9"
      />
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        Send Magic Link
      </Button>
    </form>
  );
};