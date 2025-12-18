import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

interface WelcomeModalProps {
  user: User | null;
}

const WELCOME_LETTERS = {
  fan: `Hey… so you made it here.

You've taken the first step into the space of the artist whose music has inspired you—not just the hits, the stories, the late-night drops, the moments no one else saw.

I'm a fan too. I want to be there after the streams, after the album rollouts—not just a follower, but a true fan, a real one.

And clearly you are too, so rest easy, you're on the inside now.

Love,
Dara`,

  artist: `Heyy… just wanted to let you know that I see it all—how much you've put in, the music, the shows, the endless studio hours, in a world without a system built for you.

Streaming services pay cents, social media wants clicks, record labels want control. Fans want connection, but everything feels noisy.

Backstage is for you—no algorithms, no ads, no noise, just a place for you and the people who really care.

You're in control, set your vibe, build your space.

Backstage, Where the real ones go.`
};

const WelcomeModal = ({ user }: WelcomeModalProps) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"fan" | "artist" | "admin" | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const checkFirstLogin = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_login")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (profile?.first_login) {
        // Fetch user role from user_roles table
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (roleData && roleData.role !== "admin") {
          setRole(roleData.role);
          setOpen(true);
        }
      }
    };

    // Small delay to ensure profile is created
    setTimeout(checkFirstLogin, 500);
  }, [user]);

  const handleClose = async () => {
    if (!user) return;

    // Mark first_login as false
    await supabase
      .from("profiles")
      .update({ first_login: false })
      .eq("id", user.id);

    setOpen(false);

    // Redirect based on role
    if (role === "artist") {
      navigate("/artist-dashboard");
    } else {
      navigate("/home");
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl bg-background border-border p-0 overflow-hidden" aria-describedby="welcome-description">
        <div id="welcome-description" className="sr-only">
          Welcome letter from the platform explaining the mission and values.
        </div>
        <div className="relative min-h-[70vh] flex items-center justify-center p-12">
          {/* Gradient background effect */}
          <div className="absolute inset-0 gradient-primary opacity-5"></div>

          <div className="relative z-10 space-y-8 max-w-xl">
            {/* Letter content */}
            <div className="letter-text text-foreground whitespace-pre-line text-center">
              {WELCOME_LETTERS[role]}
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleClose}
                className="gradient-primary text-primary-foreground font-semibold px-8 py-6 text-lg transition-smooth hover:shadow-lg hover:shadow-primary/20"
              >
                Enter Backstage
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
