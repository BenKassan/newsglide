
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '@/services/userDataService';
import { useToast } from '@/hooks/use-toast';

export const useUserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await getUserProfile(user.id);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    if (!user) return;

    setUpdating(true);
    try {
      const updatedProfile = await updateUserProfile(user.id, updates);
      setProfile(updatedProfile);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    updating,
    updateProfile,
    refetch: fetchProfile
  };
};
