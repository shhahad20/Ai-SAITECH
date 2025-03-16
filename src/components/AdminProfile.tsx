import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Settings, Shield, Activity, Database, 
  HardDrive, Search, Users, BarChart4, AlertCircle 
} from 'lucide-react';
import type { User as UserType } from '../types';

interface SystemLog {
  id: string;
  action: string;
  user_id: string;
  timestamp: string;
  details: string;
}

interface StorageStats {
  totalSize: number;
  documentCount: number;
  userCount: number;
}

export const AdminProfile: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userData) {
          setCurrentUser(userData);
        }

        // Fetch system logs
        const { data: logs } = await supabase
          .from('document_audit_logs')
          .select(`
            id,
            action,
            user_id,
            timestamp,
            changes as details
          `)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (logs) {
          setSystemLogs(logs);
        }

        // Fetch storage stats
        const { data: documents } = await supabase
          .from('documents')
          .select('content');
        
        const { data: users } = await supabase
          .from('users')
          .select('id');

        setStorageStats({
          totalSize: documents?.reduce((acc, doc) => acc + (doc.content?.length || 0), 0) || 0,
          documentCount: documents?.length || 0,
          userCount: users?.length || 0
        });
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!currentUser?.is_admin) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>Access denied. Admin privileges required.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar */}
      <div className="col-span-3 bg-gray-700 rounded-lg p-4">
        <div className="space-y-2">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center gap-2 w-full p-2 rounded-lg text-left ${
              activeSection === 'profile' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`flex items-center gap-2 w-full p-2 rounded-lg text-left ${
              activeSection === 'users' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveSection('system')}
            className={`flex items-center gap-2 w-full p-2 rounded-lg text-left ${
              activeSection === 'system' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Activity className="w-4 h-4" />
            System Logs
          </button>
          <button
            onClick={() => setActiveSection('storage')}
            className={`flex items-center gap-2 w-full p-2 rounded-lg text-left ${
              activeSection === 'storage' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Database className="w-4 h-4" />
            Storage
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={`flex items-center gap-2 w-full p-2 rounded-lg text-left ${
              activeSection === 'settings' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="col-span-9 space-y-6">
        {activeSection === 'profile' && (
          <div className="bg-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Admin Profile
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <p className="text-white">{currentUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                <p className="text-white">Administrator</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Account Created</label>
                <p className="text-white">{formatDate(currentUser.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <p className="text-green-400">Active</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="bg-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              System Logs
            </h2>
            <div className="space-y-4">
              {systemLogs.map((log) => (
                <div key={log.id} className="border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-blue-400 font-medium">{log.action}</span>
                      <p className="text-sm text-gray-400 mt-1">{log.details}</p>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'storage' && storageStats && (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                Storage Overview
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Storage Used</h3>
                  <p className="text-2xl font-bold text-white">{formatBytes(storageStats.totalSize)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Documents</h3>
                  <p className="text-2xl font-bold text-white">{storageStats.documentCount}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Users</h3>
                  <p className="text-2xl font-bold text-white">{storageStats.userCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <BarChart4 className="w-5 h-5 text-blue-400" />
                Storage Analytics
              </h2>
              <div className="h-64 flex items-center justify-center text-gray-400">
                Storage usage chart will be displayed here
              </div>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="bg-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              System Settings
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      checked
                    />
                    <span className="text-gray-300">Enable two-factor authentication</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      checked
                    />
                    <span className="text-gray-300">Log all administrative actions</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Storage Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Maximum file size (MB)
                    </label>
                    <input
                      type="number"
                      className="bg-gray-800 rounded-lg px-3 py-2 text-white w-full"
                      value="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Allowed file types
                    </label>
                    <input
                      type="text"
                      className="bg-gray-800 rounded-lg px-3 py-2 text-white w-full"
                      value=".docx, .txt"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};