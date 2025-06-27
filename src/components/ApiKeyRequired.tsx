
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyManager } from './ApiKeyManager';
import { Key, AlertCircle } from 'lucide-react';

interface ApiKeyRequiredProps {
  onKeyValidated: (isValid: boolean) => void;
}

export const ApiKeyRequired: React.FC<ApiKeyRequiredProps> = ({ onKeyValidated }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Key className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            API Key Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            To use NewsGlide, you need to provide an OpenAI API key. This allows the app to analyze news from multiple sources and generate comprehensive reports.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
            <h4 className="font-semibold text-blue-800 mb-2">How to get an API key:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
              <li>Sign in or create an account</li>
              <li>Navigate to API Keys</li>
              <li>Create a new secret key</li>
              <li>Copy and paste it below</li>
            </ol>
          </div>
          
          <div className="pt-4">
            <ApiKeyManager onKeyValidated={onKeyValidated} />
          </div>
          
          <p className="text-xs text-gray-500">
            Your API key is stored securely in your browser and never sent to our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
