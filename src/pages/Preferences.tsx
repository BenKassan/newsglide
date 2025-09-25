
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Settings, Bell, Eye, Newspaper } from 'lucide-react';

interface UserPreferences {
  default_reading_level: string;
  email_notifications: boolean;
  preferred_news_sources: string[];
  theme: string;
  font_size: string;
}

const NEWS_SOURCES = [
  'CNN', 'BBC', 'Reuters', 'Associated Press', 'NPR', 'The Guardian',
  'The New York Times', 'The Washington Post', 'Fox News', 'CNBC'
];

export default function Preferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>({
    default_reading_level: 'base',
    email_notifications: true,
    preferred_news_sources: [],
    theme: 'light',
    font_size: 'medium'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // Load preferences asynchronously without blocking UI
    fetchPreferences();
  }, [user, navigate]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('default_reading_level, email_notifications, preferred_news_sources, theme, font_size')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          default_reading_level: data.default_reading_level || 'base',
          email_notifications: data.email_notifications ?? true,
          preferred_news_sources: data.preferred_news_sources || [],
          theme: data.theme || 'light',
          font_size: data.font_size || 'medium'
        });
      } else {
        // Create default preferences if they don't exist
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user!.id,
          default_reading_level: 'base',
          email_notifications: true,
          preferred_news_sources: [],
          theme: 'light',
          font_size: 'medium'
        });

      if (error) {
        console.error('Error creating default preferences:', error);
      }
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  const handleSourceToggle = (source: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      preferred_news_sources: checked
        ? [...prev.preferred_news_sources, source]
        : prev.preferred_news_sources.filter(s => s !== source)
    }));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          default_reading_level: preferences.default_reading_level,
          email_notifications: preferences.email_notifications,
          preferred_news_sources: preferences.preferred_news_sources,
          theme: preferences.theme,
          font_size: preferences.font_size
        })
        .eq('user_id', user!.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Preferences saved',
        description: 'Your settings have been updated successfully.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Show UI immediately with loading states instead of full loading screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to NewsGlide
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Preferences
              </h1>
              <p className="text-gray-600">Customize your NewsGlide experience</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Reading Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Reading Preferences
                </CardTitle>
                <CardDescription>
                  Control how news content is presented to you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reading-level">Default Reading Level</Label>
                  <Select
                    value={preferences.default_reading_level}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, default_reading_level: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger id="reading-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Standard - Clear and accessible</SelectItem>
                      <SelectItem value="eli5">Simple - Explain like I'm 5</SelectItem>
                      <SelectItem value="phd">Academic - Detailed and technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive updates about trending topics and saved articles
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email_notifications: checked }))}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* News Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  Preferred News Sources
                </CardTitle>
                <CardDescription>
                  Select your preferred news outlets for personalized content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {NEWS_SOURCES.map((source) => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={source}
                        checked={preferences.preferred_news_sources.includes(source)}
                        onCheckedChange={(checked) => handleSourceToggle(source, checked as boolean)}
                        disabled={loading}
                      />
                      <Label htmlFor={source} className="text-sm font-medium">
                        {source}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select
                    value={preferences.font_size}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, font_size: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger id="font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={savePreferences}
                disabled={saving || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
