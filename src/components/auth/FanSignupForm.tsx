import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check, X, ArrowLeft } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(15, "Username must be less than 15 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

interface FanSignupFormProps {
    onBack: () => void;
}

export const FanSignupForm = ({ onBack }: FanSignupFormProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        username: "",
    });
    const [usernameStatus, setUsernameStatus] = useState<"checking" | "available" | "taken" | null>(null);

    // Check username availability in real-time
    useEffect(() => {
        const checkUsername = async () => {
            if (formData.username.length < 3) {
                setUsernameStatus(null);
                return;
            }

            setUsernameStatus("checking");

            const { data, error } = await supabase
                .from("profiles")
                .select("username")
                .eq("username", formData.username)
                .maybeSingle();

            if (error) {
                console.error("Error checking username:", error);
                setUsernameStatus(null);
                return;
            }

            setUsernameStatus(data ? "taken" : "available");
        };

        const debounce = setTimeout(checkUsername, 500);
        return () => clearTimeout(debounce);
    }, [formData.username]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            signupSchema.parse(formData);

            if (usernameStatus === "taken") {
                toast({
                    title: "Username taken",
                    description: "Please choose a different username",
                    variant: "destructive"
                });
                return;
            }

            setLoading(true);

            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        role: "fan"
                    },
                    emailRedirectTo: `${window.location.origin}/`
                }
            });

            if (error) {
                if (error.message.includes("already registered")) {
                    toast({
                        title: "Account exists",
                        description: "This email is already registered. Please log in instead.",
                        variant: "destructive"
                    });
                } else {
                    throw error;
                }
            } else {
                toast({
                    title: "Welcome to Backstage!",
                    description: "Your account has been created successfully."
                });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast({
                    title: "Validation Error",
                    description: error.errors[0].message,
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to create account. Please try again.",
                    variant: "destructive"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSignup} className="space-y-6 bg-card p-8 rounded-lg border border-border animate-fade-in">
            <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="mb-2 pl-0 hover:bg-transparent hover:text-primary"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Role Selection
            </Button>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="bg-background"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                    <Input
                        id="username"
                        type="text"
                        placeholder="your_username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        disabled={loading}
                        className="bg-background pr-10"
                    />
                    {formData.username.length >= 3 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus === "checking" && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                            {usernameStatus === "available" && (
                                <Check className="w-4 h-4 text-green-500" />
                            )}
                            {usernameStatus === "taken" && (
                                <X className="w-4 h-4 text-destructive" />
                            )}
                        </div>
                    )}
                </div>
                {usernameStatus === "taken" && (
                    <p className="text-xs text-destructive">Username taken</p>
                )}
                {usernameStatus === "available" && (
                    <p className="text-xs text-green-500">Available</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="bg-background"
                />
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground font-semibold py-6 transition-smooth hover:shadow-lg hover:shadow-primary/20"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                    </>
                ) : (
                    "Create Fan Account"
                )}
            </Button>
        </form>
    );
};
