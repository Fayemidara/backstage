import { supabase } from "@/integrations/supabase/client";

/**
 * Check if the current user is subscribed to a specific artist
 * @param artistId - The artist's user ID
 * @returns Promise<{isSubscribed: boolean, communityId: string | null}>
 */
export async function checkSubscription(artistId: string): Promise<{
  isSubscribed: boolean;
  communityId: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { isSubscribed: false, communityId: null };
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, community_id")
      .eq("user_id", user.id)
      .eq("artist_id", artistId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Subscription check error:", error);
      return { isSubscribed: false, communityId: null };
    }

    return {
      isSubscribed: !!data,
      communityId: data?.community_id || null,
    };
  } catch (error) {
    console.error("Subscription check failed:", error);
    return { isSubscribed: false, communityId: null };
  }
}
