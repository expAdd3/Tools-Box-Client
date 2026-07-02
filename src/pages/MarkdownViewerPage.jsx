import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronDown, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const slugify = (text) => {
  const normalized = String(text)
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=|{}':;',\[\].<>/?！￥…（）—【】‘；：”“'。，、？]/g, '')
    .replace(/\s+/g, '-');

  return normalized || 'section';
};

const parseMarkdownHeadings = (markdown) => {
  const lines = markdown.split('\n');
  const counts = new Map();
  const headings = [];
  let inFence = false;
  let charIndex = 0;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      charIndex += line.length + 1;
      return;
    }

    if (!inFence) {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const base = slugify(text);
        const count = (counts.get(base) || 0) + 1;
        counts.set(base, count);
        const id = count === 1 ? base : `${base}-${count}`;

        headings.push({ id, text, level, lineIndex, charIndex });
      }
    }

    charIndex += line.length + 1;
  });

  return headings;
};

const buildTocTree = (items) => {
  const roots = [];
  const stack = [];

  items.forEach((item) => {
    const node = { ...item, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return roots;
};

const collectExpandableIds = (nodes) => {
  const ids = [];

  const walk = (list) => {
    list.forEach((node) => {
      if (node.children.length > 0) {
        ids.push(node.id);
        walk(node.children);
      }
    });
  };

  walk(nodes);
  return ids;
};

// 统一的拖拽分隔条：两条线由同一组件渲染，高度/位置保证一致
// 竖条对齐到内容框（顶部偏移 = padding 16px + header 36px = 52px，高度 = 内容框高度）
const ResizeHandle = () => (
  <PanelResizeHandle className="group w-3 mx-1 flex items-start justify-center cursor-col-resize">
    <div className="mt-[52px] h-[calc(75vh-36px)] w-1.5 rounded-full bg-border transition-colors group-hover:bg-muted-foreground/70" />
  </PanelResizeHandle>
);

const baseComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  p: (props) => <p className="my-2 leading-relaxed" {...props} />,
  ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 my-2" {...props} />,
  li: (props) => <li className="my-1" {...props} />,
  blockquote: (props) => <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground my-2" {...props} />,
  table: (props) => <table className="w-full border-collapse my-2 text-sm" {...props} />,
  thead: (props) => <thead className="bg-muted" {...props} />,
  th: (props) => <th className="border px-3 py-2 text-left font-semibold" {...props} />,
  td: (props) => <td className="border px-3 py-2" {...props} />,
  tr: (props) => <tr className="border-b" {...props} />,
  a: (props) => <a className="text-blue-600 hover:underline" {...props} />,
  hr: (props) => <hr className="my-4 border-border" {...props} />,
  input: (props) => <input type="checkbox" disabled className="mr-2 align-middle" {...props} />,
};

const headingClassMap = {
  1: 'text-3xl font-bold mt-4 mb-2 border-b pb-2',
  2: 'text-2xl font-bold mt-4 mb-2 border-b pb-1',
  3: 'text-xl font-bold mt-3 mb-1',
  4: 'text-lg font-semibold mt-3 mb-1',
  5: 'text-base font-semibold mt-2 mb-1',
  6: 'text-sm font-semibold mt-2 mb-1 text-muted-foreground',
};

const MarkdownPreview = ({ markdown, tocItems }) => {
  let headingIndex = -1;

  const renderHeading = (Tag, level) => ({ children, ...props }) => {
    headingIndex += 1;
    const heading = tocItems[headingIndex];
    const id = heading?.id;

    return (
      <Tag id={id} data-toc-id={id} className={headingClassMap[level]} {...props}>
        {children}
      </Tag>
    );
  };

  const renderCode = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');

    if (!inline && match) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ fontSize: '12px' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }

    return (
      <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs" {...props}>
        {children}
      </code>
    );
  };

  const previewComponents = {
    ...baseComponents,
    code: renderCode,
    h1: renderHeading('h1', 1),
    h2: renderHeading('h2', 2),
    h3: renderHeading('h3', 3),
    h4: renderHeading('h4', 4),
    h5: renderHeading('h5', 5),
    h6: renderHeading('h6', 6),
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={previewComponents}>
      {markdown}
    </ReactMarkdown>
  );
};

const MarkdownViewerPage = () => {
  const [markdown, setMarkdown] = useState('');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [fullscreenTocCollapsed, setFullscreenTocCollapsed] = useState(false);
  const [activeTocId, setActiveTocId] = useState('');
  const [openMap, setOpenMap] = useState({});

  const panelGroupRef = useRef(null);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const fullscreenPreviewRef = useRef(null);

  const tocItems = useMemo(() => parseMarkdownHeadings(markdown), [markdown]);
  const tocTree = useMemo(() => buildTocTree(tocItems), [tocItems]);
  const expandableIds = useMemo(() => collectExpandableIds(tocTree), [tocTree]);

  useEffect(() => {
    setOpenMap((prev) => {
      const next = {};
      expandableIds.forEach((id) => {
        next[id] = prev[id] ?? true;
      });
      return next;
    });
  }, [expandableIds]);

  const expandAll = () => {
    const next = {};
    expandableIds.forEach((id) => {
      next[id] = true;
    });
    setOpenMap(next);
  };

  const collapseAll = () => {
    const next = {};
    expandableIds.forEach((id) => {
      next[id] = false;
    });
    setOpenMap(next);
  };

  const toggleNode = (id) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setCollapsedLayout = (collapsed) => {
    const group = panelGroupRef.current;
    if (!group) return;

    const sizes = collapsed ? [5, 35, 60] : [16, 32, 52];
    group.setLayout(sizes);
  };

  const handleToggleMainTocCollapse = () => {
    setTocCollapsed((prev) => {
      const next = !prev;
      setCollapsedLayout(next);
      return next;
    });
  };

  const scrollTextareaToHeading = (item) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(item.charIndex, item.charIndex);

    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;
    const targetTop = Math.max(0, item.lineIndex * lineHeight - textarea.clientHeight * 0.3);
    textarea.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  const scrollPreviewToHeading = (container, id) => {
    if (!container || !id) return;

    const headings = Array.from(container.querySelectorAll('[data-toc-id]'));
    const target = headings.find((el) => el.getAttribute('data-toc-id') === id);
    if (!target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = container.scrollTop + (targetRect.top - containerRect.top) - 8;

    container.scrollTo({ top, behavior: 'smooth' });
  };

  const handleTocClick = (item) => {
    setActiveTocId(item.id);
    scrollTextareaToHeading(item);
    scrollPreviewToHeading(previewRef.current, item.id);

    if (fullscreenOpen) {
      scrollPreviewToHeading(fullscreenPreviewRef.current, item.id);
    }
  };

  const renderTocNodes = (nodes, depth = 0) => (
    <div className="space-y-1">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = openMap[node.id] ?? true;

        return (
          <div key={node.id}>
            <div className="flex items-center gap-1">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  style={{ marginLeft: `${depth * 14}px` }}
                  onClick={() => toggleNode(node.id)}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="h-6 w-6" style={{ marginLeft: `${depth * 14}px` }} />
              )}

              <button
                type="button"
                onClick={() => handleTocClick(node)}
                className={`flex-1 text-left text-sm rounded px-2 py-1 hover:bg-accent ${activeTocId === node.id ? 'bg-accent font-medium' : ''}`}
              >
                {node.text}
              </button>
            </div>

            {hasChildren && isOpen ? renderTocNodes(node.children, depth + 1) : null}
          </div>
        );
      })}
    </div>
  );

  const renderTocPanel = (className, collapsed, onToggleCollapse, compactHeader = false, showTitle = false, bodyClassName = 'h-full') => {
    if (collapsed) {
      return (
        <div className={`${className} flex flex-col`}>
          <div className={`flex items-center ${compactHeader ? 'h-7' : ''} mb-2`}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className={`border rounded-md bg-card ${bodyClassName}`} />
        </div>
      );
    }

    return (
      <div className={className}>
        <div className={`flex items-center justify-between mb-2 ${compactHeader ? 'h-7' : ''}`}>
          <div className="flex items-center gap-1 min-w-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onToggleCollapse}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {showTitle ? <p className={`${compactHeader ? 'text-[11px]' : 'text-xs'} font-medium leading-none whitespace-nowrap`}>目录</p> : null}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={expandAll}>
              展开
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={collapseAll}>
              折叠
            </Button>
          </div>
        </div>

        <div className={`border rounded-md p-2 bg-card ${bodyClassName} overflow-auto font-serif`}>
          {tocTree.length > 0 ? (
            renderTocNodes(tocTree)
          ) : (
            <p className="text-xs text-muted-foreground p-2">暂无标题，输入 # 标题后会自动生成目录</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Markdown 展示器</h1>

      <PanelGroup ref={panelGroupRef} direction="horizontal" className="min-h-[600px]">
        <Panel defaultSize={16} minSize={5} className="flex flex-col p-4 pr-2">
          {renderTocPanel('h-[75vh]', tocCollapsed, handleToggleMainTocCollapse, true, true, 'h-[calc(75vh-36px)]')}
        </Panel>

        {!tocCollapsed && <ResizeHandle />}

        <Panel defaultSize={32} minSize={18} className="flex flex-col p-4 px-2">
          <div className="flex items-center justify-end mb-2 h-7">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setMarkdown('')}>
              <X className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>
          <Textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="在此输入 Markdown 内容..."
            className="w-full h-[calc(75vh-36px)] min-h-[calc(75vh-36px)] max-h-[calc(75vh-36px)] font-mono overflow-y-auto text-muted-foreground"
          />
        </Panel>

        <ResizeHandle />

        <Panel defaultSize={52} minSize={24} className="flex flex-col p-4 pl-2">
          <div className="flex items-center justify-end mb-2 h-7">
            <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                  <Maximize2 className="h-4 w-4 mr-1" />
                  全屏
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] max-w-[96vw] h-[96vh] [&>button]:hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="flex items-center justify-between">
                    <span>Markdown 全屏预览</span>
                    <Button variant="ghost" size="sm" onClick={() => setFullscreenOpen(false)}>
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </DialogTitle>
                </DialogHeader>

                <div className="mt-2 flex-1 min-h-0 flex gap-3">
                  {renderTocPanel(
                    fullscreenTocCollapsed ? 'w-[52px] min-w-[52px] h-full' : 'w-[320px] min-w-[280px] h-full',
                    fullscreenTocCollapsed,
                    () => setFullscreenTocCollapsed((prev) => !prev),
                    true,
                    true,
                    'h-[calc(100%-36px)]'
                  )}
                  <div ref={fullscreenPreviewRef} className="flex-1 overflow-auto border rounded-md p-6 bg-card">
                    <MarkdownPreview markdown={markdown} tocItems={tocItems} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div ref={previewRef} className="border rounded-md p-4 bg-card h-[calc(75vh-36px)] overflow-auto">
            <MarkdownPreview markdown={markdown} tocItems={tocItems} />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default MarkdownViewerPage;