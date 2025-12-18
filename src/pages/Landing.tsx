import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Music } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary blur-3xl opacity-30 rounded-full"></div>
            <div className="relative bg-card border border-border rounded-full p-6">
              <Music className="w-16 h-16 text-primary" />
            </div>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Backstage
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-muted-foreground font-light">
          Where the real ones go.
        </p>

        {/* CTA Buttons */}
        <div className="space-y-4 pt-8">
          <Button
            onClick={() => navigate("/auth/signup")}
            className="w-full gradient-primary text-primary-foreground font-semibold py-6 text-lg transition-smooth hover:shadow-lg hover:shadow-primary/20"
          >
            Sign Up
          </Button>
          
          <Button
            onClick={() => navigate("/auth/login")}
            variant="outline"
            className="w-full py-6 text-lg border-border hover:bg-secondary transition-smooth"
          >
            Log In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
