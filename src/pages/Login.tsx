import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Google } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      console.error("OAuth sign‑in error:", error);
    } else {
      // After successful sign‑in Supabase will redirect back to the app.
      // The AuthProvider will pick up the session and we can navigate.
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Button
        onClick={handleGoogleSignIn}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-lg"
      >
        <Google className="w-5 h-5" />
        Sign in with Google
      </Button>
    </div>
  );
};

export default Login;