"use client";

import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { LogIn } from "lucide-react";

export const LoginDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white">
          <LogIn className="w-4 h-4 mr-1" />
          Login
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Sign In</DialogTitle>
          <DialogDescription className="text-center">
            Choose a provider or sign in with email.
          </DialogDescription>
        </DialogHeader>

        <Auth
          supabaseClient={supabase}
          providers={["google", "github", "email"]}
          appearance={{ theme: ThemeSupa }}
          theme="light"
        />
      </DialogContent>
    </Dialog>
  );
};