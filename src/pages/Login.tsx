import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Auth
        supabaseClient={supabase}
        providers={["google"]}
        appearance={{ theme: ThemeSupa }}
        theme="light"
        magicLink={false}
        onSignIn={() => navigate("/")}
      />
    </div>
  );
};

export default Login;