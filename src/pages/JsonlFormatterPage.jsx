
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, ClipboardPaste, X, ChevronDown, ChevronUp, AlertCircle, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import JsonTree from '@/components/JsonTree';

const JsonlFormatterPage = () => {
  const [inputText, setInputText] = useState('');
  const [parsedLines, setParsedLines] = useState([]);
  const [openItems, setOpenItems] = useState({});
  const [preserveEscape, setPreserveEscape] = useState(false);
  const [errors, setErrors] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [panelHeights, setPanelHeights] = useState({});
  const MAX_DISPLAY_ITEMS = 10;
  const DEFAULT_PANEL_HEIGHT = 520;
  const MIN_PANEL_HEIGHT = 320;
  const MAX_PANEL_HEIGHT = 1000;

  useEffect(() => {
    if (!inputText.trim()) {
      setParsedLines([]);
      setErrors([]);
      setOpenItems({});
      setTotalItems(0);
      return;
    }

    const lines = inputText.split('\n');
    const chunks = [];
    const errs = [];
    let buffer = '';
    let startLine = 0;

    const getBracketDepth = (text) => {
      let depth = 0;
      let inString = false;
      let escapeNext = false;

      for (let j = 0; j < text.length; j++) {
        const char = text[j];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{' || char === '[') depth++;
          else if (char === '}' || char === ']') depth--;
        }
      }

      return depth;
    };

    const tryFlushChunk = (force = false) => {
      const trimmed = buffer.trim();
      if (!trimmed) return false;

      const depth = getBracketDepth(buffer);
      const isComplete = depth === 0 && (trimmed.endsWith('}') || trimmed.endsWith(']'));

      if (!isComplete && !force) return false;

      chunks.push({ text: buffer, startLine });
      buffer = '';
      return true;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!buffer.trim() && !line.trim()) continue;

      if (!buffer) {
        buffer = line;
        startLine = i;
      } else {
        buffer += '\n' + line;
      }

      tryFlushChunk();
    }

    tryFlushChunk(true);

    const preserveEscapesRecursively = (value) => {
      if (typeof value === 'string') {
        return JSON.stringify(value).slice(1, -1);
      }

      if (Array.isArray(value)) {
        return value.map((item) => preserveEscapesRecursively(item));
      }

      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, preserveEscapesRecursively(v)])
        );
      }

      return value;
    };

    const decodeEscapesRecursively = (value) => {
      if (typeof value === 'string') {
        return value
          .replace(/\\r\\n/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }

      if (Array.isArray(value)) {
        return value.map((item) => decodeEscapesRecursively(item));
      }

      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, decodeEscapesRecursively(v)])
        );
      }

      return value;
    };

    const parsedResults = chunks.map((chunk) => {
      try {
        const parsed = JSON.parse(chunk.text);
        const displayData = preserveEscape ? preserveEscapesRecursively(parsed) : decodeEscapesRecursively(parsed);
        const formatted = JSON.stringify(displayData, null, 2);

        return {
          raw: chunk.text,
          formatted,
          isValid: true,
          parsedData: displayData,
          startLine: chunk.startLine,
        };
      } catch (err) {
        errs.push(`第 ${chunk.startLine + 1} 行附近: ${err.message}`);
        return {
          raw: chunk.text,
          formatted: chunk.text,
          isValid: false,
          error: err.message,
          parsedData: null,
          startLine: chunk.startLine,
        };
      }
    });

    setTotalItems(parsedResults.length);
    setParsedLines(parsedResults.slice(0, MAX_DISPLAY_ITEMS));
    setErrors(errs);

    const newOpenItems = {};
    parsedResults.slice(0, MAX_DISPLAY_ITEMS).forEach((_, idx) => {
      newOpenItems[idx] = true;
    });
    setOpenItems(newOpenItems);
  }, [inputText, preserveEscape]);

  const copyToClipboard = async (text, label) => {
    if (!text) return toast.error('没有内容可复制');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(`${label}已复制到剪贴板`);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success(ok ? `${label}已复制到剪贴板` : '复制失败');
      }
    } catch {
      toast.error('复制失败');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        setInputText(text);
        toast.success('已粘贴内容');
      } else {
        const ta = document.createElement('textarea');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus();
        if (document.execCommand('paste')) {
          setInputText(ta.value);
          toast.success('已粘贴内容');
        } else {
          toast.error('粘贴失败，请手动粘贴');
        }
        document.body.removeChild(ta);
      }
    } catch {
      toast.error('粘贴失败');
    }
  };

  const clearAll = () => {
    setInputText('');
    setParsedLines([]);
    setErrors([]);
    setOpenItems({});
    setTotalItems(0);
  };

  const toggleItem = (index) => {
    setOpenItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const updatePanelHeight = (index, delta) => {
    setPanelHeights(prev => {
      const current = prev[index] ?? DEFAULT_PANEL_HEIGHT;
      const next = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, current + delta));
      return { ...prev, [index]: next };
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">JSONL 格式化工具</h1>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>输入 JSONL</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={pasteFromClipboard}>
              <ClipboardPaste className="h-4 w-4 mr-1" />
              粘贴
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此粘贴 JSONL 数据，每行一个 JSON 对象..."
            className="min-h-[150px] font-mono"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="preserve-escape"
                checked={preserveEscape}
                onCheckedChange={setPreserveEscape}
              />
              <Label htmlFor="preserve-escape">保留转义</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(inputText, '原始JSONL')}
              disabled={!inputText.trim()}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制原始JSONL
            </Button>
          </div>
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              <div className="flex items-center gap-1 font-medium mb-1">
                <AlertCircle className="h-4 w-4" />
                解析错误
              </div>
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            如果解析效果差，请使用：
            <a
              href="https://www.json.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              https://www.json.cn/
            </a>
          </div>
        </CardContent>
      </Card>

      {parsedLines.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">解析结果</h2>
            <span className="text-sm text-muted-foreground">展示 {parsedLines.length} / {totalItems}</span>
          </div>
          {totalItems > MAX_DISPLAY_ITEMS && (
            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
              最多展示前 {MAX_DISPLAY_ITEMS} 条 JSON，已自动截断。
            </div>
          )}
          {parsedLines.map((line, index) => (
            <Collapsible key={index} open={!!openItems[index]} onOpenChange={() => toggleItem(index)}>
              <Card>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">JSON {index + 1}</span>
                    {!line.isValid && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">解析失败</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePanelHeight(index, -80);
                      }}
                      title="缩小"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePanelHeight(index, 80);
                      }}
                      title="放大"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(line.formatted, `JSON ${index + 1}`);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {openItems[index] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {line.isValid && line.parsedData ? (
                      <div
                        className="bg-muted p-4 rounded-md overflow-auto font-mono text-sm resize-y"
                        style={{ height: `${panelHeights[index] ?? DEFAULT_PANEL_HEIGHT}px`, minHeight: `${MIN_PANEL_HEIGHT}px`, maxHeight: `${MAX_PANEL_HEIGHT}px` }}
                      >
                        <JsonTree data={line.parsedData} />
                      </div>
                    ) : (
                      <pre
                        className="bg-muted p-4 rounded-md overflow-auto font-mono text-sm whitespace-pre-wrap resize-y"
                        style={{ height: `${panelHeights[index] ?? DEFAULT_PANEL_HEIGHT}px`, minHeight: `${MIN_PANEL_HEIGHT}px`, maxHeight: `${MAX_PANEL_HEIGHT}px` }}
                      >
                        {line.formatted}
                      </pre>
                    )}
                    {line.error && <p className="text-sm text-red-600 mt-2">{line.error}</p>}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

export default JsonlFormatterPage;

