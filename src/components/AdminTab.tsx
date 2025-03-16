import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Shield, Users, Activity, Settings } from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminProfile } from './AdminProfile';

interface AdminTabProps {
  onUpload: (files: File[], isUniversal: boolean) => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({ onUpload }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'profile'>('dashboard');

  return (
    <div className="h-full flex flex-col">
      {/* Admin Navigation */}
      <div className="flex space-x-1 rounded-xl bg-gray-800/50 p-1 mb-6">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex items-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${activeView === 'dashboard' 
              ? 'bg-gray-700 text-white shadow'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
          <Activity className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('profile')}
          className={`flex items-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${activeView === 'profile'
              ? 'bg-gray-700 text-white shadow'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
          <Settings className="w-4 h-4" />
          Admin Profile
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeView === 'dashboard' ? (
          <AdminDashboard onUpload={onUpload} />
        ) : (
          <AdminProfile />
        )}
      </div>
    </div>
  );
};