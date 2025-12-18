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
    artistName: z.string()
        .min(2, "Artist name must be at least 2 characters")
        .max(30, "Artist name must be less than 30 characters")
        .regex(/^[a-zA-Z0-9\s_\-]+$/, "Artist name can only contain letters, numbers, spaces, underscores, and hyphens"),
});

interface ArtistSignupFormProps {
    onBack: () => void;
}

export const ArtistSignupForm = ({ onBack }: ArtistSignupFormProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        artistName: "",
    });
    const [nameStatus, setNameStatus] = useState<"checking" | "available" | "taken" | null>(null);

    // Check artist name availability in real-time (checking artist_usernames table)
    useEffect(() => {
        const checkName = async () => {
            if (formData.artistName.length < 2) {
                setNameStatus(null);
                return;
            }

            setNameStatus("checking");

            const { data, error } = await supabase
                .from("artist_usernames")
                .select("username")
                .eq("username", formData.artistName)
                .maybeSingle();

            if (error) {
                console.error("Error checking artist name:", error);
                setNameStatus(null);
                return;
            }

            setNameStatus(data ? "taken" : "available");
        };

        const debounce = setTimeout(checkName, 500);
        return () => clearTimeout(debounce);
    }, [formData.artistName]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            signupSchema.parse(formData);

            if (nameStatus === "taken") {
                toast({
                    title: "Name taken",
                    description: "This artist name is already taken. Please choose another.",
                    variant: "destructive"
                });
                return;
            }

            setLoading(true);

            // 1. Sign up the user
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        role: "artist"
                        // Note: We do NOT send username here. 
                        // The handle_new_user trigger will create a profile with a generic name.
                        // We will insert the real artist name into artist_usernames after verification upload.
                    },
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
                setLoading(false);
            } else if (data.user) {
                // 2. Success! Create artist_usernames record immediately
                const { error: nameError } = await supabase
                    .from("artist_usernames")
                    .insert({
                        artist_id: data.user.id,
                        username: formData.artistName,
                        verified: false
                    });

                if (nameError) {
                    console.error("Error creating username:", nameError);
                    // Continue anyway, we can fix it later or it might be a duplicate (which we checked)
                }

                toast({
                    title: "Account created!",
                    description: "Welcome! Please verify your profile in the dashboard.",
                });

                // 3. Redirect to dashboard
                // We use window.location to ensure a full refresh and state update
                window.location.href = "/artist-dashboard";
            }
        } catch (error) {
            setLoading(false);
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
                    placeholder="artist@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="bg-background"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="artistName">Artist Name</Label>
                <div className="relative">
                    <Input
                        id="artistName"
                        type="text"
                        placeholder="Your Stage Name"
                        value={formData.artistName}
                        onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                        required
                        disabled={loading}
                        className="bg-background pr-10"
                    />
                    {formData.artistName.length >= 2 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {nameStatus === "checking" && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                            {nameStatus === "available" && (
                                <Check className="w-4 h-4 text-green-500" />
                            )}
                            {nameStatus === "taken" && (
                                <X className="w-4 h-4 text-destructive" />
                            )}
                        </div>
                    )}
                </div>
                {nameStatus === "taken" && (
                    <p className="text-xs text-destructive">Name already taken</p>
                )}
                {nameStatus === "available" && (
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
                    "Continue to Verification"
                )}
            </Button>
        </form>
    );
};
