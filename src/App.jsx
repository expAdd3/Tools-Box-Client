import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import JsonDiffPage from './pages/JsonDiffPage';
import JsonFormatterPage from './pages/JsonFormatterPage';
import JsonlFormatterPage from './pages/JsonlFormatterPage';
import TextDiffPage from './pages/TextDiffPage';
import TimestampConverterPage from './pages/TimestampConverterPage';
import DateDifferencePage from './pages/DateDifferencePage';
import AsciiConverterPage from './pages/AsciiConverterPage';
import UnicodeConverterPage from './pages/UnicodeConverterPage';
import Base64Converter from './pages/Base64Converter';
import UuidGenerator from './pages/UuidGenerator';
import TextDeduplicator from './pages/TextDeduplicator';
import PlaceholderPage from './pages/PlaceholderPage';
import JwtParser from './pages/JwtParser';
import UrlEncoderDecoder from './pages/UrlEncoderDecoder';
import MarkdownViewerPage from './pages/MarkdownViewerPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 所有页面始终保持挂载，仅通过 CSS 隐藏非当前页，
  // 这样切换 Tab 时各页面的输入内容（组件 local state）不会被销毁。
  const pages = [
    <JsonDiffPage />,
    <JsonFormatterPage />,
    <JsonlFormatterPage />,
    <TextDiffPage />,
    <TimestampConverterPage />,
    <DateDifferencePage />,
    <AsciiConverterPage />,
    <UnicodeConverterPage />,
    <Base64Converter />,
    <UuidGenerator />,
    <TextDeduplicator />,
    <JwtParser />,
    <UrlEncoderDecoder />,
    <MarkdownViewerPage />,
    <PlaceholderPage />,
  ];

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <div className="h-screen bg-background flex overflow-hidden">
          <aside className={`hidden md:flex border-r bg-background flex-shrink-0 flex-col transition-all duration-200 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />
          </aside>
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="w-full flex-1 min-h-0 overflow-auto">
              {pages.map((page, index) => (
                <div key={index} className={activeTab === index ? 'h-full' : 'hidden'}>
                  {page}
                </div>
              ))}
            </main>
            <footer className="h-14 shrink-0 border-t bg-background px-4 md:px-6 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">© 2026 Developer Toolbox</span>
              <a
                href="https://github.com/expAdd3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="打开 GitHub"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </footer>
            <Toaster />
          </div>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;