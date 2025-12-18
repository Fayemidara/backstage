import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VerificationUploadProps {
    userId: string;
    artistName: string;
    email: string;
}

export const VerificationUpload = ({ userId, artistName, email }: VerificationUploadProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [sessionReady, setSessionReady] = useState(false);

    // Wait for auth session to be established
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id === userId) {
                setSessionReady(true);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.id === userId) {
                setSessionReady(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [userId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast({
                title: "No file selected",
                description: "Please select a screenshot to upload",
                variant: "destructive",
            });
            return;
        }

        if (!sessionReady) {
            toast({
                title: "Session initializing",
                description: "Please wait a moment for your session to be ready...",
            });
            return;
        }

        setLoading(true);

        try {
            // 1. Upload Screenshot
            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/verification_${Date.now()}.${fileExt}`;

            console.log("Attempting upload:", {
                bucket: 'verifications',
                path: filePath,
                userId: userId,
                fileSize: file.size
            });

            const { error: uploadError } = await supabase.storage
                .from('verifications')
                .upload(filePath, file);

            if (uploadError) {
                console.error("Supabase Storage Error:", uploadError);
                throw uploadError;
            }

            // 2. Insert into verifications table
            const { error: dbError } = await supabase
                .from('verifications')
                .insert({
                    artist_id: userId,
                    full_name: artistName,
                    email: email,
                    screenshot_url: filePath,
                    status: 'pending'
                });

            if (dbError) throw dbError;

            // 3. (Removed) artist_usernames is already created at signup.
            // We do NOT need to upsert here.

            toast({
                title: "Success",
                description: "Your verification request has been sent.",
            });

            // Do NOT reload the page.
            // The parent component or context should ideally listen to changes, 
            // but per instructions we just show the toast.

        } catch (error: any) {
            console.error("Verification upload error:", error);
            toast({
                title: "Upload Failed",
                description: error.message || "Failed to upload verification. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 bg-card p-8 rounded-lg border border-border animate-fade-in text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-primary" />
            </div>

            <h2 className="text-2xl font-bold">Verify Your Artist Profile</h2>
            <p className="text-muted-foreground">
                To prevent impersonation, please upload a screenshot of your logged-in profile
                from Spotify for Artists, Apple Music for Artists, or similar.
            </p>

            <form onSubmit={handleUpload} className="space-y-6 mt-6">
                <div className="space-y-2 text-left">
                    <Label htmlFor="screenshot">Screenshot Proof</Label>
                    <Input
                        id="screenshot"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        required
                        className="cursor-pointer"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={loading || !file || !sessionReady}
                    className="w-full gradient-primary text-primary-foreground font-semibold py-6"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : !sessionReady ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        "Submit for Verification"
                    )}
                </Button>
            </form>
        </div>
    );
};
