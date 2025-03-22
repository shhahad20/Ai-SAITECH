import React from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
// import { useDocumentSections } from '../lib/sections';
import { useTabStructure } from '../lib/sections';

// interface SubTab {
//   id: string;
//   name: string;
//   description?: string;
// }

// interface Tab {
//   id: string;
//   name: string;
//   subTabs?: SubTab[];
// }

interface TabsProps {
  activeTab: string;
  activeSubTab?: string;
  // onTabChange: (tab: string, subTab?: string) => void;
  onTabChange: (tabId: string, subTabId?: string) => void;
}
// Define explicit types for the tab structure
interface TabItem {
  id: string;
  name: string;
  subTabs?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}
 
export const Tabs: React.FC<TabsProps> = ({ activeTab, activeSubTab, onTabChange }) => {
  const { tabs, loading, error } = useTabStructure();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="h-10 bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        Error loading navigation: {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tabs.map((tab) => (
        <div key={tab.id} className="space-y-1">
          <button
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center justify-between w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5',
              activeTab === tab.id
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
            )}
          >
            <span className="flex-1 text-left">{tab.name}</span>
            {'subTabs' in tab && tab.subTabs && tab.subTabs.length > 0 && (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </button>

          {'subTabs' in tab && tab.subTabs && tab.subTabs.length > 0 && (
            <div className="ml-4 space-y-1">
              {tab.subTabs.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => onTabChange(tab.id, subTab.id)}
                  className={cn(
                    'w-full text-left rounded-lg py-2 px-4 text-sm',
                    activeSubTab === subTab.id
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700/50'
                  )}
                >
                  {subTab.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};