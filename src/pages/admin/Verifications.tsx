import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";

interface Verification {
    id: string;
    artist_id: string;
    full_name: string;
    email: string;
    screenshot_url: string;
    signed_url?: string | null; // Add signed_url
    status: string;
    created_at: string;
    artist_usernames: { username: string }[]; // Joined data
}



const Verifications = () => {
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            // 1. Fetch pending verifications
            const { data: verificationsData, error: verifError } = await supabase
                .from("verifications")
                .select('*')
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (verifError) throw verifError;

            if (!verificationsData || verificationsData.length === 0) {
                setVerifications([]);
                return;
            }

            // 2. Fetch corresponding usernames
            const artistIds = verificationsData.map(v => v.artist_id);
            const { data: usernamesData, error: userError } = await supabase
                .from("artist_usernames")
                .select('artist_id, username')
                .in('artist_id', artistIds);

            if (userError) throw userError;

            // 3. Merge data and generate signed URLs
            const joinedData = await Promise.all(verificationsData.map(async (v) => {
                const artistUsername = usernamesData?.find(u => u.artist_id === v.artist_id);

                // Generate signed URL for the screenshot
                const { data: signedUrlData } = await supabase.storage
                    .from('verifications')
                    .createSignedUrl(v.screenshot_url, 3600); // 1 hour expiry

                return {
                    ...v,
                    artist_usernames: artistUsername ? [{ username: artistUsername.username }] : [],
                    signed_url: signedUrlData?.signedUrl || null
                };
            }));

            setVerifications(joinedData);
        } catch (error: any) {
            console.error("Error fetching verifications:", error);
            toast({
                title: "Error loading verifications",
                description: error.message || "Unknown error occurred",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (id: string, artistId: string, approved: boolean) => {
        setProcessingId(id);
        try {
            const status = approved ? "approved" : "denied";
            const { error: updateError } = await supabase
                .from("verifications")
                .update({
                    status,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: (await supabase.auth.getUser()).data.user?.id
                })
                .eq("id", id);

            if (updateError) throw updateError;

            if (approved) {
                // Update artist_usernames to verified
                const { error: verifyError } = await supabase
                    .from("artist_usernames")
                    .update({ verified: true })
                    .eq("artist_id", artistId);

                if (verifyError) throw verifyError;
            }

            toast({
                title: approved ? "Approved" : "Denied",
                description: `Artist verification ${status}.`,
            });

            // Remove from list
            setVerifications(prev => prev.filter(v => v.id !== id));

        } catch (error) {
            console.error("Error updating verification:", error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-8 space-y-6">
            <h1 className="text-3xl font-bold">Pending Verifications</h1>

            {verifications.length === 0 ? (
                <p className="text-muted-foreground">No pending verifications.</p>
            ) : (
                <div className="grid gap-6">
                    {verifications.map((v) => (
                        <Card key={v.id} className="p-6 flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-full md:w-1/3 aspect-video bg-muted rounded-lg overflow-hidden border">
                                <a href={v.signed_url || v.screenshot_url} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={v.signed_url || v.screenshot_url}
                                        alt="Proof"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                                    />
                                </a>
                            </div>

                            <div className="flex-1 space-y-2">
                                <h3 className="text-xl font-bold">{v.artist_usernames?.[0]?.username || "Unknown Artist"}</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Full Name:</span>
                                    <span>{v.full_name}</span>
                                    <span className="text-muted-foreground">Email:</span>
                                    <span>{v.email}</span>
                                    <span className="text-muted-foreground">Submitted:</span>
                                    <span>{new Date(v.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleDecision(v.id, v.artist_id, true)}
                                    disabled={!!processingId}
                                >
                                    {processingId === v.id ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDecision(v.id, v.artist_id, false)}
                                    disabled={!!processingId}
                                >
                                    {processingId === v.id ? <Loader2 className="animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                                    Deny
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Verifications;
