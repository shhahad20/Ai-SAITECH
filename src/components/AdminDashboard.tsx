import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Shield, Activity, Globe, 
  Download, Search, Filter, MoreVertical 
} from 'lucide-react';
import { UserList } from './admin/UserList';
import { VerificationQueue } from './admin/VerificationQueue';
import { UserMetrics } from './admin/UserMetrics';
import { FileUpload } from './FileUpload';
import type { User, VerificationRequest } from '../types';

interface AdminDashboardProps {
  onUpload: (files: File[], isUniversal: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onUpload }) => {
  const [activeView, setActiveView] = useState<'users' | 'verification' | 'metrics' | 'documents'>('users');
  const [users, setUsers] = useState<User[]>([]);
  // const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
  
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Authentication required');
        
      const { data: currentUserData, error: profileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single();
        // .timeout(5000); // Add timeout
  
      if (profileError) throw profileError;
      if (!currentUserData?.is_admin) {
        throw new Error('Admin privileges required');
      }

      // Fetch all users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch verification requests
      // const { data: verificationData, error: verificationError } = await supabase
      //   .from('verification_requests')
      //   .select('*')
      //   .order('created_at', { ascending: false });

      // if (verificationError) throw verificationError;
      // setVerificationRequests(verificationData || []);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <Shield className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-1 rounded-xl bg-gray-800/50 p-1">
        <button
          onClick={() => setActiveView('users')}
          className={`flex items-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${activeView === 'users' 
              ? 'bg-gray-700 text-white shadow'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
          <Users className="w-4 h-4" />
          User Management
        </button>
        <button
          onClick={() => setActiveView('verification')}
          className={`flex items-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${activeView === 'verification'
              ? 'bg-gray-700 text-white shadow'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
          <Shield className="w-4 h-4" />
          Verification Queue
        </button>
        <button
          onClick={() => setActiveView('metrics')}
          className={`flex items-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${activeView === 'metrics'
              ? 'bg-gray-700 text-white shadow'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
          <Activity className="w-4 h-4" />
          User Metrics
        </button>
        <button
          onClick={() => setActiveView('documents')}
          className={`flex items-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${activeView === 'documents'
              ? 'bg-gray-700 text-white shadow'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
          <Globe className="w-4 h-4" />
          Documents
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-700 rounded-lg p-6">
        {activeView === 'users' && (
          <UserList 
            users={users} 
            onRefresh={loadDashboardData} 
          />
        )}
        {/* {activeView === 'verification' && (
          <VerificationQueue 
            requests={verificationRequests}
            onRefresh={loadDashboardData}
          />
        )} */}
        {activeView === 'metrics' && (
          <UserMetrics users={users} />
        )}
        {activeView === 'documents' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Universal Documents
            </h2>
            <FileUpload
              accept={{
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/plain': ['.txt'],
              }}
              onUpload={(files) => onUpload(files, true)}
              isAdmin={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};