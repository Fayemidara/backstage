import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  communityId: string;
  type: "post" | "drop_music" | "drop_merch" | "drop_ticket" | "announcement";
  message: string;
  referenceId?: string;
}

/**
 * Creates notifications for all subscribers of a community
 * @param params - Notification parameters
 */
export const createNotificationsForCommunity = async ({
  communityId,
  type,
  message,
  referenceId,
}: CreateNotificationParams) => {
  try {
    console.log("📢 [Notifications] Creating notifications for:", {
      communityId,
      type,
      message,
      referenceId,
    });

    // Get all subscribers for this community (excluding the artist themselves)
    const { data: subscriptions, error: subsError } = await supabase
      .from("subscriptions")
      .select("user_id, artist_id")
      .eq("community_id", communityId)
      .eq("status", "active");

    if (subsError) {
      console.error("❌ [Notifications] Error fetching subscriptions:", subsError);
      return;
    }

    console.log("✅ [Notifications] Fetched subscriptions:", subscriptions);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("⚠️ [Notifications] No subscribers to notify");
      return; // No subscribers to notify
    }

    // Get current user (artist)
    const { data: { user } } = await supabase.auth.getUser();
    const artistId = user?.id;
    console.log("👤 [Notifications] Current user (artist) ID:", artistId);

    // Filter out the artist from notifications
    const subscribersToNotify = subscriptions.filter(
      (sub) => sub.user_id !== artistId
    );

    console.log("📋 [Notifications] Subscribers to notify (excluding artist):", subscribersToNotify);

    if (subscribersToNotify.length === 0) {
      console.log("⚠️ [Notifications] No one to notify (only the artist is subscribed)");
      return; // No one to notify (only the artist is subscribed)
    }

    // Create notification records for all subscribers
    const notificationRecords = subscribersToNotify.map((sub) => ({
      user_id: sub.user_id,
      message,
      type,
      community_id: communityId,
      reference_id: referenceId || null,
      read: false,
    }));

    console.log("📝 [Notifications] Notification records to insert:", notificationRecords);

    // Batch insert notifications
    const { data: insertedData, error: insertError } = await supabase
      .from("notifications")
      .insert(notificationRecords)
      .select();

    if (insertError) {
      console.error("❌ [Notifications] Error creating notifications:", insertError);
    } else {
      console.log("✅ [Notifications] Successfully created notifications:", insertedData);
    }
  } catch (error) {
    console.error("❌ [Notifications] Error in createNotificationsForCommunity:", error);
  }
};

/**
 * Mark a notification as read
 * @param notificationId - ID of the notification to mark as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
  }
};

/**
 * Mark all notifications as read for a user
 * @param userId - ID of the user
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
  }
};
