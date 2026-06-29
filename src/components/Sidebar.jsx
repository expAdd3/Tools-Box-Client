import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ThemeToggle from './ThemeToggle';
import { navConfig } from '../nav-config';

const Sidebar = ({ activeTab, setActiveTab, onClose, isCollapsed = false, setIsCollapsed }) => {
  const handleCollapseToggle = () => {
    if (setIsCollapsed) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        <div className={`p-4 border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <h2 className="text-lg font-semibold">BOX</h2>}
          <div className={`flex items-center ${isCollapsed ? 'gap-1' : 'gap-2'}`}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle compact />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">主题切换</TooltipContent>
              </Tooltip>
            ) : (
              <ThemeToggle />
            )}

            {setIsCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCollapseToggle}
                    title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
                  >
                    {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
                </TooltipContent>
              </Tooltip>
            )}

          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {navConfig.map((item, index) => {
              const Icon = item.icon;
              const navButton = (
                <Button
                  key={index}
                  variant={activeTab === index ? "secondary" : "ghost"}
                  className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                  onClick={() => {
                    setActiveTab(index);
                    if (onClose) onClose();
                  }}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
                  {!isCollapsed && item.title}
                </Button>
              );

              if (!isCollapsed) {
                return navButton;
              }

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    {navButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
