
import React from 'react';
import { ProfileModal } from './ProfileModal';
import { PreferencesModal } from './PreferencesModal';

interface UserModalsProps {
  activeModal: string | null;
  onCloseModal: () => void;
}

export const UserModals: React.FC<UserModalsProps> = ({ activeModal, onCloseModal }) => {
  return (
    <>
      <ProfileModal 
        open={activeModal === 'profile'} 
        onOpenChange={(open) => !open && onCloseModal()} 
      />
      <PreferencesModal 
        open={activeModal === 'preferences'} 
        onOpenChange={(open) => !open && onCloseModal()} 
      />
    </>
  );
};
