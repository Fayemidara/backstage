import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCounts {
  [communityId: string]: {
    total: number;
    byRoom: {
      [roomType: string]: number;
    };
  };
}

/**
 * Hook to fetch and track unread notification counts
 * Provides real-time updates for badges across rooms and communities
 */
export const useUnreadCounts = () => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("⚠️ [UnreadCounts] No user logged in");
        setUnreadCounts({});
        setTotalUnread(0);
        setLoading(false);
        return;
      }

      console.log("🔄 [UnreadCounts] Fetching unread counts for user:", user.id);

      // Fetch all unread notifications for the user
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('community_id, type, reference_id')
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error("❌ [UnreadCounts] Error fetching notifications:", error);
        throw error;
      }

      console.log("📨 [UnreadCounts] Fetched unread notifications:", notifications);

      if (!notifications || notifications.length === 0) {
        console.log("⚠️ [UnreadCounts] No unread notifications");
        setUnreadCounts({});
        setTotalUnread(0);
        setLoading(false);
        return;
      }

      // Group by community and room type
      const counts: UnreadCounts = {};
      let total = 0;

      notifications.forEach((notif) => {
        if (!notif.community_id) return;

        if (!counts[notif.community_id]) {
          counts[notif.community_id] = {
            total: 0,
            byRoom: {},
          };
        }

        // Map notification type to room type
        let roomType = 'lounge'; // Default to lounge
        if (notif.type === 'post') roomType = 'lounge';
        else if (notif.type === 'drop_music') roomType = 'music-drop';
        else if (notif.type === 'drop_merch') roomType = 'merch-drop';
        else if (notif.type === 'drop_ticket') roomType = 'ticket-drop';
        else if (notif.type === 'announcement') roomType = 'announcements';

        counts[notif.community_id].byRoom[roomType] = 
          (counts[notif.community_id].byRoom[roomType] || 0) + 1;
        counts[notif.community_id].total += 1;
        total += 1;
      });

      console.log("📊 [UnreadCounts] Aggregated counts:", counts);
      console.log("🔢 [UnreadCounts] Total unread:", total);

      setUnreadCounts(counts);
      setTotalUnread(total);
      setLoading(false);
    } catch (error) {
      console.error('❌ [UnreadCounts] Error fetching unread counts:', error);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, []);

  // Real-time subscription for notification changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('notifications-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refetch counts on any notification change
            fetchUnreadCounts();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  /**
   * Mark all notifications for a specific room as read
   */
  const markRoomAsRead = async (communityId: string, roomType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("✅ [UnreadCounts] Marking room as read:", { communityId, roomType });

      // Map room type to notification type
      let notificationType = 'post';
      if (roomType === 'music-drop') notificationType = 'drop_music';
      else if (roomType === 'merch-drop') notificationType = 'drop_merch';
      else if (roomType === 'ticket-drop') notificationType = 'drop_ticket';
      else if (roomType === 'announcements') notificationType = 'announcement';

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('community_id', communityId)
        .eq('type', notificationType)
        .eq('read', false);

      if (error) {
        console.error("❌ [UnreadCounts] Error marking room as read:", error);
      } else {
        console.log("✅ [UnreadCounts] Successfully marked room as read");
      }

      // Refetch after marking as read
      fetchUnreadCounts();
    } catch (error) {
      console.error('❌ [UnreadCounts] Error marking room as read:', error);
    }
  };

  return {
    unreadCounts,
    totalUnread,
    loading,
    markRoomAsRead,
    refetch: fetchUnreadCounts,
  };
};
