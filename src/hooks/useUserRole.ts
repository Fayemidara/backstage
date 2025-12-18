import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const [isArtist, setIsArtist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsArtist(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.role === 'artist') {
        setIsArtist(true);
      }
      
      setLoading(false);
    };

    checkRole();
  }, []);

  return { isArtist, loading };
};
