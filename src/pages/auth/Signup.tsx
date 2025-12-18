import { useState } from "react";
import { Music } from "lucide-react";
import { RoleSelection } from "@/components/auth/RoleSelection";
import { FanSignupForm } from "@/components/auth/FanSignupForm";
import { ArtistSignupForm } from "@/components/auth/ArtistSignupForm";
import { Link } from "react-router-dom";

const Signup = () => {
  const [step, setStep] = useState<"role" | "fan" | "artist">("role");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary blur-2xl opacity-30 rounded-full"></div>
            <div className="relative bg-card border border-border rounded-full p-4">
              <Music className="w-10 h-10 text-primary" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground">Join the real ones</p>
        </div>

        {/* Content */}
        {step === "role" && (
          <RoleSelection onSelect={(role) => setStep(role)} />
        )}

        {step === "fan" && (
          <div className="max-w-md mx-auto">
            <FanSignupForm onBack={() => setStep("role")} />
          </div>
        )}

        {step === "artist" && (
          <div className="max-w-md mx-auto">
            <ArtistSignupForm onBack={() => setStep("role")} />
          </div>
        )}

        {step === "role" && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Log In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Signup;
