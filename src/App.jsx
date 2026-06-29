
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

  const renderPage = () => {
    switch (activeTab) {
      case 0:
        return <JsonDiffPage />;
      case 1:
        return <JsonFormatterPage />;
      case 2:
        return <JsonlFormatterPage />;
      case 3:
        return <TextDiffPage />;
      case 4:
        return <TimestampConverterPage />;
      case 5:
        return <DateDifferencePage />;
      case 6:
        return <AsciiConverterPage />;
      case 7:
        return <UnicodeConverterPage />;
      case 8:
        return <Base64Converter />;
      case 9:
        return <UuidGenerator />;
      case 10:
        return <TextDeduplicator />;
      case 11:
        return <JwtParser />;
      case 12:
        return <UrlEncoderDecoder />;
      case 13:
        return <MarkdownViewerPage />;
      case 14:
        return <PlaceholderPage />;
      default:
        return <JsonDiffPage />;
    }
  };

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
              {renderPage()}
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

