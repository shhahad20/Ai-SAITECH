import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Trash2, Edit2, Download, Search, Filter, 
  CheckCircle, XCircle, MoreVertical, UserPlus, AlertTriangle 
} from 'lucide-react';
import { ExportData } from './ExportData';
import { CreateUserModal } from './CreateUserModal';
import type { User } from '../../types';

interface UserListProps {
  users: User[];
  onRefresh: () => void;
}

interface DeleteConfirmationModalProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ user, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h3 className="text-lg font-semibold">Confirm User Deletion</h3>
      </div>
      
      <p className="text-gray-300 mb-6">
        Are you sure you want to delete the user <span className="font-semibold">{user.email}</span>? 
        This action cannot be undone.
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete User
        </button>
      </div>
    </div>
  </div>
);

export const UserList: React.FC<UserListProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = async (user: User) => {
    if (user.is_admin) {
      alert('Admin users cannot be deleted');
      return;
    }
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);

      // Use the secure RPC function to delete the user
      const { error } = await supabase.rpc('delete_user', {
        user_id: userToDelete.id
      });

      if (error) throw error;

      setUserToDelete(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleToggleAdminStatus = async (user: User) => {
    if (!confirm(`Are you sure you want to ${user.is_admin ? 'remove' : 'grant'} admin privileges?`)) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !user.is_admin })
        .eq('id', user.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateUser(true)}
            className="flex items-center gap-2 px-4 py-3 bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-lg hover:bg-gray-600"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {user.first_name || user.last_name ? 
                          `${user.first_name} ${user.last_name}` : 
                          user.email}
                      </div>
                      {user.first_name || user.last_name ? (
                        <div className="text-sm text-gray-400">{user.email}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-300">
                    {user.department || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleUserStatus(user)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.is_active 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleAdminStatus(user)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.is_admin
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                  >
                    {user.is_admin ? 'Admin' : 'User'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.is_admin || isDeleting}
                    className={`text-red-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={user.is_admin ? 'Admin users cannot be deleted' : 'Delete user'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onSuccess={onRefresh}
        />
      )}
      {showExport && (
        <ExportData
          data={users}
          onClose={() => setShowExport(false)}
        />
      )}
      {userToDelete && (
        <DeleteConfirmationModal
          user={userToDelete}
          onConfirm={confirmDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};