import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, X, Copy, ClipboardPaste, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import JsonTree from '@/components/JsonTree';

const JsonFormatterPage = () => {
  const [inputJson, setInputJson] = useState('');
  const [formattedJson, setFormattedJson] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [isTreeView, setIsTreeView] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);
  const [preserveEscape, setPreserveEscape] = useState(false);

  // 拖拽调整宽度相关状态
  const [leftWidth, setLeftWidth] = useState(35); // 左侧默认占 35%
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // 处理拖拽移动
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;

      // 限制最小和最大宽度
      if (newLeftWidth >= 20 && newLeftWidth <= 60) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // 从字符串中提取 JSON 内容 - 增强版本
  const extractJsonFromString = (str) => {
    if (!str || typeof str !== 'string') return str;

    // 去除首尾空白
    let trimmed = str.trim();

    // 如果字符串被包裹在引号中，先去除外层引号
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      try {
        // 尝试解析为字符串（处理转义）
        const unquoted = JSON.parse(trimmed);
        if (typeof unquoted === 'string') {
          trimmed = unquoted.trim();
        }
      } catch {
        // 如果解析失败，手动去除引号
        trimmed = trimmed.slice(1, -1).trim();
      }
    }

    // 尝试找到 JSON 的开始位置（{ 或 [）
    const firstBrace = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');

    let startIndex = -1;
    if (firstBrace === -1 && firstBracket === -1) {
      return str; // 没有找到 JSON 标记，返回原字符串
    } else if (firstBrace === -1) {
      startIndex = firstBracket;
    } else if (firstBracket === -1) {
      startIndex = firstBrace;
    } else {
      startIndex = Math.min(firstBrace, firstBracket);
    }

    // 找到对应的结束位置 - 使用栈来匹配括号
    let endIndex = trimmed.length;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    const openChar = trimmed[startIndex];
    const closeChar = openChar === '{' ? '}' : ']';

    for (let i = startIndex; i < trimmed.length; i++) {
      const char = trimmed[i];

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
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
    }

    return trimmed.substring(startIndex, endIndex);
  };

  // 尝试修复常见的 JSON 格式问题
  const fixCommonJsonIssues = (str) => {
    if (!str || typeof str !== 'string') return str;

    let fixed = str;

    // 1. 处理未转义的换行符和制表符
    fixed = fixed.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

    // 2. 处理尾随逗号（在对象和数组中）
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // 3. 处理单引号（转为双引号）
    if (fixed.trim().startsWith("'") && fixed.trim().endsWith("'")) {
      fixed = fixed.trim().slice(1, -1);
    }

    // 4. 处理 JavaScript undefined
    fixed = fixed.replace(/: undefined/g, ': null').replace(/:undefined/g, ':null');

    // 5. 处理 Python 风格的单引号 JSON
    if (fixed.trim().startsWith("'") && fixed.trim().endsWith("'")) {
      try {
        // 尝试替换单引号为双引号
        fixed = fixed.replace(/'/g, '"');
      } catch {
        // 忽略错误
      }
    }

    return fixed;
  };

  // 检查字符串是否是 JSON 字符串 - 增强版本
  const isJsonString = (str) => {
    if (typeof str !== 'string' || !str.trim()) return false;

    const trimmed = str.trim();

    // 情况 1: 标准 JSON 对象或数组（以 { 或 [ 开头和结尾）
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      // 额外验证：尝试找到匹配的括号
      try {
        let depth = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < trimmed.length; i++) {
          const char = trimmed[i];

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
            if (char === '{' || char === '[') {
              depth++;
            } else if (char === '}' || char === ']') {
              depth--;
              if (depth < 0) break;
            }
          }
        }

        // 如果括号匹配，很可能是 JSON
        if (depth === 0) {
          return true;
        }
      } catch {
        // 验证失败，继续其他检查
      }
    }

    // 情况 2: 字符串被包裹在引号中，但内部包含 JSON
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      try {
        const unwrapped = JSON.parse(trimmed);
        if (typeof unwrapped === 'string') {
          const innerTrimmed = unwrapped.trim();
          if ((innerTrimmed.startsWith('{') && innerTrimmed.endsWith('}')) ||
              (innerTrimmed.startsWith('[') && innerTrimmed.endsWith(']'))) {
            return true;
          }
        }
      } catch {
        // 解析失败，尝试手动去除引号检查
        const unwrapped = trimmed.slice(1, -1).trim();
        if ((unwrapped.startsWith('{') && unwrapped.endsWith('}')) ||
            (unwrapped.startsWith('[') && unwrapped.endsWith(']'))) {
          return true;
        }
      }
    }

    // 情况 3: 包含转义的 JSON 标记（原始转义序列）
    if (trimmed.includes('\\"') && (trimmed.includes('\\{') || trimmed.includes('\\['))) {
      return true;
    }

    // 情况 4: 包含转义的反斜杠和引号（双重转义）
    if (trimmed.includes('\\\\') && trimmed.includes('\\"')) {
      return true;
    }

    return false;
  };

  // 递归解析对象/数组中的 JSON 字符串字段 - 增强版本
  const deepParseJsonStrings = (obj, depth = 0, maxDepth = 15) => {
    if (depth > maxDepth) return obj;

    if (obj === null || typeof obj !== 'object') {
      // 如果是字符串，尝试解析为 JSON
      if (typeof obj === 'string' && isJsonString(obj)) {
        const result = tryParseJson(obj, depth + 1, maxDepth);
        if (result.success) {
          return result.data;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => deepParseJsonStrings(item, depth + 1, maxDepth));
    }

    // 处理对象
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        result[key] = deepParseJsonStrings(value, depth + 1, maxDepth);
      }
    }
    return result;
  };

  // 尝试解析 JSON 序列化后的字符串（递归解析）- 增强版本
  const tryParseJson = (str, depth = 0, maxDepth = 15) => {
    // 防止无限递归
    if (depth > maxDepth) {
      return { success: false, error: '递归深度超过限制，可能是循环引用的 JSON' };
    }

    if (!str) {
      return { success: true, data: null };
    }

    // 如果已经是对象，递归解析其中的 JSON 字符串字段
    if (typeof str === 'object' && str !== null) {
      const parsedObj = deepParseJsonStrings(str, depth, maxDepth);
      return { success: true, data: parsedObj };
    }

    if (typeof str !== 'string') {
      return { success: true, data: str };
    }

    // 首先检查是否是纯字符串（去除引号后）
    const trimmed = str.trim();

    // 处理被引号包裹的字符串（可能是双重编码的 JSON）
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      try {
        const unwrapped = JSON.parse(trimmed);
        if (typeof unwrapped === 'string' && isJsonString(unwrapped)) {
          // 递归解析解包后的字符串
          const innerResult = tryParseJson(unwrapped, depth + 1, maxDepth);
          if (innerResult.success) {
            return innerResult;
          }
        }
      } catch {
        // 尝试手动去除引号
        try {
          const manualUnwrapped = trimmed.slice(1, -1).trim();
          if (isJsonString(manualUnwrapped)) {
            const innerResult = tryParseJson(manualUnwrapped, depth + 1, maxDepth);
            if (innerResult.success) {
              return innerResult;
            }
          }
        } catch {
          // 继续尝试其他方法
        }
      }
    }

    try {
      // 首先尝试直接解析
      let parsed = JSON.parse(str);

      // 递归解析结果中的 JSON 字符串字段
      parsed = deepParseJsonStrings(parsed, depth + 1, maxDepth);

      return { success: true, data: parsed };
    } catch (e) {
      // 直接解析失败，尝试提取 JSON 内容
      try {
        const extracted = extractJsonFromString(str);
        if (extracted && extracted !== str) {
          // 提取到了不同的内容，递归尝试解析
          const result = tryParseJson(extracted, depth + 1, maxDepth);
          if (result.success) {
            return result;
          }
        }

        // 尝试修复常见问题后再次解析
        const fixed = fixCommonJsonIssues(str);
        if (fixed !== str) {
          try {
            const fixedParsed = JSON.parse(fixed);
            // 递归解析结果中的 JSON 字符串字段
            const deepParsed = deepParseJsonStrings(fixedParsed, depth + 1, maxDepth);
            return { success: true, data: deepParsed };
          } catch {
            // 修复后仍然失败，继续尝试提取
            const fixedExtracted = extractJsonFromString(fixed);
            if (fixedExtracted && fixedExtracted !== fixed) {
              const fixedResult = tryParseJson(fixedExtracted, depth + 1, maxDepth);
              if (fixedResult.success) {
                return fixedResult;
              }
            }
          }
        }

        // 尝试去除可能的转义并再次解析
        let cleaned = str
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/^["']|["']$/g, '');

        const extracted2 = extractJsonFromString(cleaned);
        const result2 = tryParseJson(extracted2, depth + 1, maxDepth);
        if (result2.success) {
          return result2;
        }

        // 尝试处理多层嵌套的字符串
        if (str.startsWith('"') && str.endsWith('"')) {
          try {
            const unwrapped = JSON.parse(str);
            if (typeof unwrapped === 'string') {
              const unwrappedResult = tryParseJson(unwrapped, depth + 1, maxDepth);
              if (unwrappedResult.success) {
                return unwrappedResult;
              }
            }
          } catch {
            // 继续尝试其他方法
          }
        }
      } catch {
        // 提取也失败了
      }

      return { success: false, error: e.message };
    }
  };

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

  // 自动格式化 JSON
  useEffect(() => {
    if (!inputJson.trim()) {
      setFormattedJson('');
      setParsedData(null);
      setError('');
      return;
    }

    try {
      const result = tryParseJson(inputJson);

      if (result.success) {
        const displayData = preserveEscape
          ? preserveEscapesRecursively(result.data)
          : decodeEscapesRecursively(result.data);
        setParsedData(displayData);
        setFormattedJson(JSON.stringify(displayData, null, 2));
        setError('');
      } else {
        setError('JSON格式错误: ' + result.error);
        setParsedData(null);
        setFormattedJson('');
      }
    } catch (e) {
      setError('解析过程中发生错误: ' + e.message);
      setParsedData(null);
      setFormattedJson('');
    }
  }, [inputJson, preserveEscape]);

  const clearAll = () => {
    setInputJson('');
    setFormattedJson('');
    setParsedData(null);
    setError('');
  };

  const copyToClipboard = async () => {
    if (!formattedJson) {
      toast.error('没有格式化结果可复制');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedJson);
        toast.success('已复制到剪贴板');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedJson;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          toast.success('已复制到剪贴板');
        } else {
          toast.error('复制失败: 请手动复制 (Ctrl+C)');
        }
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setInputJson(text);
        toast.success('已粘贴JSON');
      } else {
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();

        if (document.execCommand('paste')) {
          setInputJson(textarea.value);
          toast.success('已粘贴JSON');
        } else {
          toast.error('粘贴失败: 请手动粘贴 (Ctrl+V)');
        }

        document.body.removeChild(textarea);
      }
    } catch (err) {
      toast.error('粘贴失败: ' + err.message);
    }
  };

  // 切换所有节点的展开/折叠状态
  const toggleAllExpanded = () => {
    setAllExpanded(prev => !prev);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">JSON 格式化工具</h1>

      {error && (
        <Alert variant="destructive" className="mb-4 relative">
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setError('')}
              className="text-current opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Terminal className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        ref={containerRef}
        className="flex gap-0 relative"
        style={{ minHeight: '760px' }}
      >
        <div style={{ width: `${leftWidth}%` }} className="flex-shrink-0">
          <Card className="h-full">
            <CardHeader className="flex flex-row justify-between items-center py-3">
              <CardTitle className="text-base">输入JSON</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pasteFromClipboard}
                  className="flex items-center gap-1 h-8 px-2"
                  title="粘贴JSON"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  粘贴
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputJson('')}
                  className="flex items-center gap-1 h-8 px-2"
                  title="清空输入"
                >
                  <X className="h-3.5 w-3.5" />
                  清空
                </Button>
                <div className="flex items-center space-x-2 rounded-md border px-2 h-8">
                  <Switch
                    id="preserve-escape"
                    checked={preserveEscape}
                    onCheckedChange={setPreserveEscape}
                  />
                  <Label htmlFor="preserve-escape" className="text-xs text-muted-foreground cursor-pointer">
                    保留转义
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder="在此粘贴需要格式化的JSON，支持嵌套的JSON序列化字符串，输入后自动格式化..."
                className="min-h-[680px] h-[680px] font-mono text-sm resize-y border-0 focus-visible:ring-0 p-0"
              />
              <p className="text-xs text-muted-foreground mt-2">
                提示：支持自动格式化，输入即自动转换
              </p>
            </CardContent>
          </Card>
        </div>

        <div
          className={`w-4 flex-shrink-0 flex items-center justify-center cursor-col-resize transition-colors ${isDragging ? 'bg-blue-200' : 'bg-muted hover:bg-accent'}`}
          onMouseDown={handleMouseDown}
          title="拖拽调整宽度"
        >
          <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-blue-400' : 'bg-muted-foreground/70'}`}></div>
        </div>

        <div style={{ width: `${100 - leftWidth - 1}%` }} className="flex-shrink-0">
          <Card className="h-full">
            <CardHeader className="flex flex-row justify-between items-center py-3">
              <CardTitle className="text-base">格式化结果</CardTitle>
              <div className="flex gap-1 flex-wrap">
                {parsedData && typeof parsedData === 'object' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTreeView(!isTreeView)}
                      className="flex items-center gap-1 h-8 px-2"
                      title="切换视图模式"
                    >
                      {isTreeView ? '文本视图' : '树形视图'}
                    </Button>
                    {isTreeView && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAllExpanded}
                        className="flex items-center gap-1 h-8 px-2"
                        title="展开/折叠全部"
                      >
                        {allExpanded ? (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            全部折叠
                          </>
                        ) : (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            全部展开
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 h-8 px-2"
                  title="复制结果"
                  disabled={!formattedJson}
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="flex items-center gap-1 h-8 px-2"
                  title="清空所有"
                >
                  <X className="h-3.5 w-3.5" />
                  清空
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isTreeView && parsedData && typeof parsedData === 'object' ? (
                <div className="min-h-[680px] h-[680px] resize-y overflow-auto bg-muted rounded-md font-mono text-sm border border-border">
                  <JsonTree data={parsedData} allExpanded={allExpanded} />
                </div>
              ) : (
                <Textarea
                  value={formattedJson}
                  readOnly
                  placeholder="格式化后的JSON将显示在这里"
                  className="min-h-[680px] h-[680px] font-mono text-sm resize-y border-0 focus-visible:ring-0 p-0 bg-muted"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JsonFormatterPage;