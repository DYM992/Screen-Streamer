import { useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { MagicLinkForm } from "@/components/MagicLinkForm";

const Login = () => {
  const [useMagic, setUseMagic] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {useMagic ? (
        <>
          <MagicLinkForm />
          <button
            onClick={() => setUseMagic(false)}
            className="mt-4 text-sm text-indigo-400 underline"
          >
            Back to Email/Password login
          </button>
        </>
      ) : (
        <>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{ theme: ThemeSupa }}
            theme="light"
          />
          <button
            onClick={() => setUseMagic(true)}
            className="mt-4 text-sm text-indigo-400 underline"
          >
            Use Magic Link instead
          </button>
        </>
      )}
    </div>
  );
};

export default Login;