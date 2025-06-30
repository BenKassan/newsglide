
import React from 'react';
import { Button } from "@/components/ui/button";
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="outline" className="bg-white/80 backdrop-blur-sm">
          <User className="h-4 w-4 mr-2" />
          Sign In
        </Button>
      </Link>
    );
  }

  const userInitial = user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
          {userInitial}
        </div>
        <span className="hidden sm:inline">
          {user.email?.split('@')[0]}
        </span>
      </div>
      <Button
        onClick={signOut}
        variant="outline"
        size="sm"
        className="bg-white/80 backdrop-blur-sm"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};
