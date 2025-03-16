import React from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SubTab {
  id: string;
  name: string;
  description?: string;
}

interface Tab {
  id: string;
  name: string;
  subTabs?: SubTab[];
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  activeSubTab?: string;
  onTabChange: (tab: string, subTab?: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  activeSubTab,
  onTabChange 
}) => {
  const [expandedTabs, setExpandedTabs] = React.useState<Set<string>>(new Set([activeTab]));

  const toggleExpand = (tabId: string) => {
    const newExpanded = new Set(expandedTabs);
    if (newExpanded.has(tabId)) {
      newExpanded.delete(tabId);
    } else {
      newExpanded.add(tabId);
    }
    setExpandedTabs(newExpanded);
  };

  return (
    <div className="space-y-2">
      {tabs.map((tab) => (
        <div key={tab.id} className="space-y-1">
          <button
            onClick={() => {
              if (tab.subTabs?.length) {
                toggleExpand(tab.id);
              } else {
                onTabChange(tab.id);
              }
            }}
            className={cn(
              'flex items-center justify-between w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 cursor-pointer',
              'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
              activeTab === tab.id && !activeSubTab
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
            )}
          >
            <span className="flex-1 text-left">{tab.name}</span>
            {tab.subTabs?.length && (
              <span className="ml-2 flex items-center">
                {expandedTabs.has(tab.id) 
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />
                }
              </span>
            )}
          </button>

          {tab.subTabs && expandedTabs.has(tab.id) && (
            <div className="ml-4 space-y-1">
              {tab.subTabs.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => onTabChange(tab.id, subTab.id)}
                  className={cn(
                    'flex items-center w-full rounded-lg py-2 px-4 text-sm font-medium leading-5 cursor-pointer',
                    'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    activeSubTab === subTab.id
                      ? 'bg-gray-700 text-white shadow'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
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