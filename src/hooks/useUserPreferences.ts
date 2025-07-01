
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPreferences, updateUserPreferences } from '@/services/userDataService';
import { useToast } from '@/hooks/use-toast';

export const useUserPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchPreferences = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await getUserPreferences(user.id);
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePrefs = async (updates: any) => {
    if (!user) return;

    setUpdating(true);
    try {
      const updatedPrefs = await updateUserPreferences(user.id, updates);
      setPreferences(updatedPrefs);
      toast({
        title: "Success",
        description: "Preferences updated successfully"
      });
      return updatedPrefs;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  return {
    preferences,
    loading,
    updating,
    updatePreferences: updatePrefs,
    refetch: fetchPreferences
  };
};
