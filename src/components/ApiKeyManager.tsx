
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import OpenAI from 'openai';

interface ApiKeyManagerProps {
  onKeyValidated?: (isValid: boolean) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeyValidated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [hasKey, setHasKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingKey();
  }, []);

  const checkExistingKey = () => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setHasKey(true);
      setApiKey(storedKey);
      setKeyStatus('unknown');
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      const openai = new OpenAI({
        apiKey: key,
        dangerouslyAllowBrowser: true
      });

      // Test with a simple API call
      await openai.models.list();
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateApiKey(apiKey.trim());
      
      if (isValid) {
        localStorage.setItem('openai_api_key', apiKey.trim());
        setKeyStatus('valid');
        setHasKey(true);
        onKeyValidated?.(true);
        toast({
          title: "Success",
          description: "API key validated and saved successfully",
        });
        setIsOpen(false);
      } else {
        setKeyStatus('invalid');
        toast({
          title: "Invalid API Key",
          description: "The API key is not valid or doesn't have the required permissions",
          variant: "destructive",
        });
      }
    } catch (error) {
      setKeyStatus('invalid');
      toast({
        title: "Validation Error",
        description: "Failed to validate API key",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setHasKey(false);
    setKeyStatus('unknown');
    onKeyValidated?.(false);
    toast({
      title: "API Key Removed",
      description: "Your API key has been removed from local storage",
    });
  };

  const getStatusBadge = () => {
    switch (keyStatus) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Invalid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {hasKey ? 'API Settings' : 'Setup API Key'}
          {hasKey && keyStatus === 'valid' && <CheckCircle className="h-3 w-3 text-green-500" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Key Configuration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge()}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key:</label>
                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveKey} 
                    disabled={isValidating || !apiKey.trim()}
                    className="flex-1"
                  >
                    {isValidating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Validating...
                      </div>
                    ) : (
                      'Save & Validate'
                    )}
                  </Button>
                  
                  {hasKey && (
                    <Button variant="outline" onClick={handleRemoveKey}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Your API key is stored locally in your browser</p>
            <p>• Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenAI Platform</a></p>
            <p>• Requires access to GPT-4 and Responses API</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
