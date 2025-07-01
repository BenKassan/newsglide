
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/useUserProfile';
import { User } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onOpenChange }) => {
  const { profile, loading, updating, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.full_name.length > 50) {
      return;
    }

    try {
      await updateProfile({
        full_name: formData.full_name || null,
        avatar_url: formData.avatar_url || null
      });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={profile?.email || ''} 
              disabled 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {formData.full_name.length}/50 characters
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
            <Input
              id="avatar_url"
              value={formData.avatar_url}
              onChange={(e) => handleInputChange('avatar_url', e.target.value)}
              placeholder="https://example.com/your-avatar.jpg"
              type="url"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updating || formData.full_name.length > 50}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
