import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import WelcomeModal from "./WelcomeModal";

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        // Handle auth state changes (login/logout)
        if (session?.user && _event === 'SIGNED_IN') {
          // Defer async operations to prevent deadlock
          setTimeout(() => {
            (async () => {
              // User just signed in - check their profile
              const { data: profile } = await supabase
                .from("profiles")
                .select("first_login")
                .eq("id", session.user.id)
                .maybeSingle();

              const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .maybeSingle();

              // Only redirect if NOT first login (modal will handle first login)
              if (profile && !profile.first_login) {
                let targetRoute = "/home";
                if (roleData?.role === "admin") {
                  targetRoute = "/admin/verifications";
                } else if (roleData?.role === "artist") {
                  targetRoute = "/artist-dashboard";
                }

                if (location.pathname === "/auth/login" || location.pathname === "/auth/signup") {
                  navigate(targetRoute);
                }
              }
            })();
          }, 0);
        } else if (!session && _event === 'SIGNED_OUT') {
          // User signed out - go to landing
          setTimeout(() => {
            if (location.pathname !== "/" && !location.pathname.startsWith("/auth")) {
              navigate("/");
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setCheckedAuth(true);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <>
      {children}
      <WelcomeModal user={user} />
    </>
  );
};

export default AuthWrapper;
