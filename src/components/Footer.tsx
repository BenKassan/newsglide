
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <div className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
              <img 
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
                alt="NewsGlide Logo" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold">NewsGlide</span>
            </div>
            <p className="text-gray-400">
              Navigate news with clarity and confidence.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Powered By</h4>
            <div className="space-y-2 text-gray-400">
              <p>🌐 Real-time Web Search</p>
              <p>🤖 Advanced AI Synthesis</p>
              <p>📊 Multiple News Sources</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Trust & Transparency</h4>
            <div className="space-y-2 text-gray-400">
              <p>🔒 Real Sources Only</p>
              <p>🎯 Unbiased Analysis</p>
              <p>📈 Current & Accurate</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2025 NewsGlide. Real news, real sources, real analysis.</p>
        </div>
      </div>
    </div>
  );
};
