import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { DataVisualization } from '../types';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

interface DataVisualizationsProps {
  visualizations: DataVisualization[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
        <p className="text-gray-300 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const renderChart = (visualization: DataVisualization) => {
  if (!visualization.data || visualization.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No data available for visualization</p>
      </div>
    );
  }

  switch (visualization.type) {
    case 'bar':
      return (
        <BarChart data={visualization.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9CA3AF' }}
            axisLine={{ stroke: '#4B5563' }}
          />
          <YAxis
            tick={{ fill: '#9CA3AF' }}
            axisLine={{ stroke: '#4B5563' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="value" fill="#3B82F6">
            {visualization.data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      );
    
    case 'pie':
      return (
        <PieChart>
          <Pie
            data={visualization.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={150}
            fill="#8884d8"
            label
          >
            {visualization.data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      );
    
    default:
      return null;
  }
};

export const DataVisualizations: React.FC<DataVisualizationsProps> = ({ visualizations }) => {
  if (!visualizations || visualizations.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {visualizations.map((viz, index) => (
        <div key={index} className="bg-gray-700 rounded-lg p-6 shadow-xl">
          <h3 className="text-lg font-medium mb-6 text-center text-white">
            {viz.title || 'Data Visualization'}
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer>
              {renderChart(viz)}
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
};