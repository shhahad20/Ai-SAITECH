import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { User } from '../../types';

interface UserMetricsProps {
  users: User[];
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

export const UserMetrics: React.FC<UserMetricsProps> = ({ users }) => {
  // Calculate metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const admins = users.filter(u => u.is_admin).length;
  const verifiedUsers = users.filter(u => u.is_verified).length;

  // Prepare chart data
  const statusData = [
    { name: 'Active', value: activeUsers },
    { name: 'Inactive', value: totalUsers - activeUsers }
  ];

  const roleData = [
    { name: 'Admins', value: admins },
    { name: 'Regular Users', value: totalUsers - admins }
  ];

  // Group users by creation month
  const usersByMonth = users.reduce((acc: Record<string, number>, user) => {
    const month = new Date(user.created_at).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const growthData = Object.entries(usersByMonth).map(([month, count]) => ({
    month,
    users: count
  }));

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Users</h3>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active Users</h3>
          <p className="text-3xl font-bold text-green-500">{activeUsers}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Admins</h3>
          <p className="text-3xl font-bold text-blue-500">{admins}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Verified Users</h3>
          <p className="text-3xl font-bold text-yellow-500">{verifiedUsers}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* User Status Distribution */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">User Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">User Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#4B5563' }}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#4B5563' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="users" fill="#3B82F6" name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};