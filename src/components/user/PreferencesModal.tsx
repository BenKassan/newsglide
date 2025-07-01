
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Settings } from 'lucide-react';

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ open, onOpenChange }) => {
  const { preferences, loading, updating, updatePreferences } = useUserPreferences();
  const [formData, setFormData] = useState({
    default_reading_level: 'base',
    email_notifications: true,
    preferred_news_sources: [] as string[]
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        default_reading_level: preferences.default_reading_level || 'base',
        email_notifications: preferences.email_notifications ?? true,
        preferred_news_sources: preferences.preferred_news_sources || []
      });
    }
  }, [preferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updatePreferences(formData);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const newsSourceOptions = [
    'BBC News',
    'CNN',
    'Reuters',
    'Associated Press',
    'The Guardian',
    'NPR',
    'Wall Street Journal',
    'New York Times',
    'Washington Post',
    'Bloomberg'
  ];

  const toggleNewsSource = (source: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_news_sources: prev.preferred_news_sources.includes(source)
        ? prev.preferred_news_sources.filter(s => s !== source)
        : [...prev.preferred_news_sources, source]
    }));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading preferences...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reading_level">Default Reading Level</Label>
            <Select 
              value={formData.default_reading_level} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, default_reading_level: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reading level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base (Standard)</SelectItem>
                <SelectItem value="eli5">ELI5 (Simplified)</SelectItem>
                <SelectItem value="phd">PhD (Advanced)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and news
              </p>
            </div>
            <Switch
              id="email_notifications"
              checked={formData.email_notifications}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_notifications: checked }))}
            />
          </div>
          
          <div className="space-y-3">
            <Label>Preferred News Sources</Label>
            <p className="text-sm text-muted-foreground">
              Select your preferred news sources for better recommendations
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {newsSourceOptions.map((source) => (
                <div key={source} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={source}
                    checked={formData.preferred_news_sources.includes(source)}
                    onChange={() => toggleNewsSource(source)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={source} className="text-sm">{source}</Label>
                </div>
              ))}
            </div>
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
              disabled={updating}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {updating ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
