import React, { useState } from 'react';
import {
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { navConfig } from '../nav-config';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTabChange = (index) => {
    setActiveTab(index);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex h-14 items-center justify-between">
        {/* 移动端菜单按钮 */}
        <div className="md:hidden mr-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <div className="mt-6 space-y-2">
                {navConfig.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={index}
                      variant={activeTab === index ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleTabChange(index)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="md:hidden ml-auto">
          <ThemeToggle compact />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
