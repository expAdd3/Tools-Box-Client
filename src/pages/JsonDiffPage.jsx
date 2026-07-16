import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Wand2, X, FileText, Filter, ChevronDown, ChevronUp, Copy, ClipboardPaste, Loader2 } from 'lucide-react';
import { diffLines } from 'diff';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import JsonFieldNavigator from '@/components/JsonFieldNavigator';



const JsonDiffPage = () => {
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [diffResult, setDiffResult] = useState([]);
  const [error, setError] = useState('');
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [httpMethod1, setHttpMethod1] = useState('GET');
  const [httpMethod2, setHttpMethod2] = useState('GET');
  const [isLoadingLeft, setIsLoadingLeft] = useState(false);
  const [isLoadingRight, setIsLoadingRight] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // API 请求区域折叠状态
  const [isApiCollapsed, setIsApiCollapsed] = useState(false);

  // 新增状态：历史记录相关
  const [historyList1, setHistoryList1] = useState([]);
  const [showHistory1, setShowHistory1] = useState(false);
  const [historyList2, setHistoryList2] = useState([]);
  const [showHistory2, setShowHistory2] = useState(false);

  const [loadingStates, setLoadingStates] = useState({
    history1: false,
    history2: false
  });

  // 新增状态：字段导航路径
  const [leftPath, setLeftPath] = useState([]);
  const [rightPath, setRightPath] = useState([]);

  const [ignoreOptions, setIgnoreOptions] = useState({
    fieldPaths: '',
    regexPattern: '',
    ignoreDynamicValues: false,
    ignoreTypes: []
  });

  const [fieldPathSuggestions, setFieldPathSuggestions] = useState([]);
  const [showPathSuggestions, setShowPathSuggestions] = useState(false);

  const diffRef = useRef(null);
  const pathInputRef = useRef(null);
  const leftTextareaRef = useRef(null);
  const rightTextareaRef = useRef(null);

  // 引用历史记录下拉框容器
  const historyDropdownRef1 = useRef(null);
  const historyDropdownRef2 = useRef(null);

  // 点击外部区域关闭历史记录下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHistory1 && historyDropdownRef1.current && !historyDropdownRef1.current.contains(event.target)) {
        setShowHistory1(false);
      }
      if (showHistory2 && historyDropdownRef2.current && !historyDropdownRef2.current.contains(event.target)) {
        setShowHistory2(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory1, showHistory2]);

  axios.defaults.baseURL = 'http://localhost:8080/api'

  // 记录URL访问历史
  const recordUrlAccess = async (url, method, statusCode) => {
    try {
      // 调用后端接口记录URL访问
      console.log("发起请求，请求地址：http://localhost:8080/api/record");
      await axios.post('/record', {
        url,
        method,
        statusCode
      });
    } catch (err) {
      console.error('记录URL访问失败:', err);
    }
  };

  // 获取历史记录函数 - 返回包含URL和状态码的对象数组
  const fetchHistory = async (setHistoryList, historyKey) => {
    setLoadingStates(prev => ({ ...prev, [historyKey]: true }));
    try {
      const response = await axios.get('/history');
      if (response.status === 200 && response.data) {
        setHistoryList(response.data);
      }
    } catch (err) {
      toast.error('获取历史记录失败');
    } finally {
      setLoadingStates(prev => ({ ...prev, [historyKey]: false }));
    }
  };

  // 解析JSON字符串为对象
  const parseJsonSafely = (jsonString) => {
    try {
      return JSON.parse(jsonString || '{}');
    } catch (e) {
      return null;
    }
  };

  const formatJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString || '{}');
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      setError('JSON格式错误: ' + e.message);
      return jsonString;
    }
  };

  // 高亮JSON中的特定字段并滚动到位置 - 优化版本
  const highlightFieldInTextarea = (textareaRef, path) => {
    if (!textareaRef.current || path.length === 0) return;

    const jsonObj = parseJsonSafely(textareaRef.current.value);
    if (!jsonObj) return;

    let currentObj = jsonObj;
    for (const key of path) {
      if (currentObj && typeof currentObj === 'object') {
        currentObj = currentObj[key];
      } else {
        return;
      }
    }

    const fieldName = path[path.length - 1];
    const jsonString = textareaRef.current.value;

    // 更精确的正则表达式，考虑字段名前后的引号和冒号
    const regex = new RegExp(`"${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`, 'g');
    let match;
    let targetMatch = null;

    // 找到最接近当前路径的匹配项
    while ((match = regex.exec(jsonString)) !== null) {
      // 检查匹配位置是否在正确的路径层级
      const prefix = jsonString.substring(0, match.index);
      const openBraces = (prefix.match(/{/g) || []).length;
      const closeBraces = (prefix.match(/}/g) || []).length;
      const currentDepth = openBraces - closeBraces;

      // 路径深度应该比字段名深度少1
      if (currentDepth === path.length) {
        targetMatch = match;
        break;
      }
    }

    if (targetMatch) {
      const textarea = textareaRef.current;
      textarea.focus();

      // 设置选中范围 - 包括字段名和冒号
      const startIndex = targetMatch.index;
      const endIndex = startIndex + targetMatch[0].length;
      textarea.setSelectionRange(startIndex, endIndex);

      // 计算匹配位置之前的行数
      const linesBefore = (jsonString.substring(0, startIndex).match(/\n/g) || []).length;

      // 获取计算样式
      const computedStyle = getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight) || 20; // 默认行高20px
      const paddingTop = parseInt(computedStyle.paddingTop) || 0;

      // 计算滚动位置（目标行居中显示）
      const visibleLines = Math.floor(textarea.clientHeight / lineHeight);
      const targetScrollTop = Math.max(0, (linesBefore - Math.floor(visibleLines / 2)) * lineHeight - paddingTop);

      // 平滑滚动到目标位置
      textarea.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  };

  // 当路径变化时高亮字段
  useEffect(() => {
    highlightFieldInTextarea(leftTextareaRef, leftPath);
  }, [leftPath]);

  useEffect(() => {
    highlightFieldInTextarea(rightTextareaRef, rightPath);
  }, [rightPath]);

  // 处理左侧字段导航的滚动请求
  const handleLeftScrollToField = (path) => {
    setLeftPath(path);
    highlightFieldInTextarea(leftTextareaRef, path);
  };

  // 处理右侧字段导航的滚动请求
  const handleRightScrollToField = (path) => {
    setRightPath(path);
    highlightFieldInTextarea(rightTextareaRef, path);
  };

  const formatLeftJson = () => {
    setLeftJson(formatJson(leftJson));
  };

  const formatRightJson = () => {
    setRightJson(formatJson(rightJson));
  };

  // 粘贴到左侧JSON
  const pasteLeftJson = async () => {
    try {
      // 尝试使用现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setLeftJson(text);
        toast.success('已粘贴到JSON1');
        return;
      }

      // 备选方案：使用传统方法
      const textarea = document.createElement('textarea');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();

      if (document.execCommand('paste')) {
        setLeftJson(textarea.value);
        toast.success('已粘贴到JSON1');
      } else {
        toast.error('粘贴失败: 请手动粘贴 (Ctrl+V)');
      }

      document.body.removeChild(textarea);
    } catch (err) {
      toast.error('粘贴失败: ' + err.message + '，请手动粘贴 (Ctrl+V)');
    }
  };

  // 粘贴到右侧JSON
  const pasteRightJson = async () => {
    try {
      // 尝试使用现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setRightJson(text);
        toast.success('已粘贴到JSON2');
        return;
      }

      // 备选方案：使用传统方法
      const textarea = document.createElement('textarea');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();

      if (document.execCommand('paste')) {
        setRightJson(textarea.value);
        toast.success('已粘贴到JSON2');
      } else {
        toast.error('粘贴失败: 请手动粘贴 (Ctrl+V)');
      }

      document.body.removeChild(textarea);
    } catch (err) {
      toast.error('粘贴失败: ' + err.message + '，请手动粘贴 (Ctrl+V)');
    }
  };

  // 复制左侧JSON到剪贴板
  const copyLeftJson = () => {
    if (!leftJson) {
      toast.error('JSON1内容为空');
      return;
    }

    try {
      // 尝试使用现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(leftJson)
            .then(() => {
              toast.success('JSON1已复制到剪贴板');
            })
            .catch(err => {
              // 备选方案：使用传统方法
              copyWithExecCommand(leftJson);
            });
      } else {
        // 使用传统方法
        copyWithExecCommand(leftJson);
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  // 复制右侧JSON到剪贴板
  const copyRightJson = () => {
    if (!rightJson) {
      toast.error('JSON2内容为空');
      return;
    }

    try {
      // 尝试使用现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rightJson)
            .then(() => {
              toast.success('JSON2已复制到剪贴板');
            })
            .catch(err => {
              // 备选方案：使用传统方法
              copyWithExecCommand(rightJson);
            });
      } else {
        // 使用传统方法
        copyWithExecCommand(rightJson);
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  // 复制URL到剪贴板
  const copyUrl = (url) => {
    if (!url) {
      toast.error('URL为空');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => {
              toast.success('URL已复制到剪贴板');
            })
            .catch(err => {
              copyWithExecCommand(url);
            });
      } else {
        copyWithExecCommand(url);
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  // 粘贴URL
  const pasteUrl = async (setUrl) => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setUrl(text);
        toast.success('已粘贴URL');
      } else {
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();

        if (document.execCommand('paste')) {
          setUrl(textarea.value);
          toast.success('已粘贴URL');
        } else {
          toast.error('粘贴失败: 请手动粘贴 (Ctrl+V)');
        }

        document.body.removeChild(textarea);
      }
    } catch (err) {
      toast.error('粘贴失败: ' + err.message);
    }
  };

  const fetchJsonFromUrl = async (url, method, setJson, setIsLoading) => {
    if (!url) {
      setError('请输入URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { timeout: 15000 });

      if (response.data && response.data.contents) {
        const jsonData = JSON.parse(response.data.contents);
        setJson(JSON.stringify(jsonData, null, 2));

        // 在成功获取数据后记录URL访问，包含状态码
        await recordUrlAccess(url, method, response.status);
      } else {
        throw new Error('无法获取数据');
      }

    } catch (err) {
      let errorMessage = `请求失败: ${err.message}`;
      let statusCode = null;

      if (err.response) {
        statusCode = err.response.status;
        errorMessage += ` (状态码: ${statusCode})`;
        if (err.response.data) {
          if (typeof err.response.data === 'string' && err.response.data.includes('Cloudflare')) {
            errorMessage += ' - 请求被安全服务拦截';
          } else {
            errorMessage += ` - ${JSON.stringify(err.response.data).substring(0, 100)}...`;
          }
        }
      } else if (err.request) {
        // 请求已发出但没有收到响应，可能是超时
        statusCode = 408; // 使用408表示请求超时
        errorMessage += ' (无响应，请求超时)';
      }

      // 记录失败的请求
      if (url) {
        await recordUrlAccess(url, method, statusCode);
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (json) => {
    try {
      let parsed = JSON.parse(json || '{}');

      if (ignoreOptions.ignoreDynamicValues) {
        parsed = filterDynamicValues(parsed);
      }

      if (ignoreOptions.fieldPaths) {
        const paths = ignoreOptions.fieldPaths.split(',').map(p => p.trim());
        parsed = filterByPaths(parsed, paths);
      }

      if (ignoreOptions.regexPattern) {
        const regex = new RegExp(ignoreOptions.regexPattern);
        parsed = filterByRegex(parsed, regex);
      }

      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return json;
    }
  };

  const filterDynamicValues = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => filterDynamicValues(item));
    }

    const result = {};
    for (const key in obj) {
      const value = obj[key];

      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) continue;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) continue;
      }

      result[key] = filterDynamicValues(value);
    }

    return result;
  };

  const filterByPaths = (obj, paths, currentPath = '') => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
          filterByPaths(item, paths, `${currentPath}[${index}]`)
      );
    }

    const result = {};
    for (const key in obj) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (paths.some(path => fullPath.startsWith(path))) {
        continue;
      }

      result[key] = filterByPaths(obj[key], paths, fullPath);
    }

    return result;
  };

  const filterByRegex = (obj, regex, currentPath = '') => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
          filterByRegex(item, regex, `${currentPath}[${index}]`)
      );
    }

    const result = {};
    for (const key in obj) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (regex.test(fullPath)) {
        continue;
      }

      result[key] = filterByRegex(obj[key], regex, fullPath);
    }

    return result;
  };

  const extractFieldPaths = (obj, currentPath = '', paths = []) => {
    if (typeof obj !== 'object' || obj === null) return paths;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        extractFieldPaths(item, `${currentPath}[${index}]`, paths);
      });
      return paths;
    }

    for (const key in obj) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      paths.push(fullPath);

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        extractFieldPaths(obj[key], fullPath, paths);
      }
    }

    return paths;
  };

  const getFieldPathSuggestions = (inputValue) => {
    try {
      const jsonObj = JSON.parse(leftJson || '{}');
      const allPaths = extractFieldPaths(jsonObj);

      const uniquePaths = [...new Set(allPaths)];

      // 修复：只使用最后一个逗号后的内容进行匹配
      const lastSegment = inputValue.split(',').pop().trim();

      return uniquePaths.filter(path =>
          path.toLowerCase().includes(lastSegment.toLowerCase())
      );
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    if (leftJson && showPathSuggestions) {
      const suggestions = getFieldPathSuggestions(ignoreOptions.fieldPaths);
      setFieldPathSuggestions(suggestions);
    }
  }, [leftJson, ignoreOptions.fieldPaths, showPathSuggestions]);

  const compareJson = () => {
    setError('');
    try {
      const filteredLeft = applyFilters(leftJson);
      const filteredRight = applyFilters(rightJson);

      const parsedLeft = JSON.parse(filteredLeft || '{}');
      const parsedRight = JSON.parse(filteredRight || '{}');

      const leftStr = JSON.stringify(parsedLeft, null, 2);
      const rightStr = JSON.stringify(parsedRight, null, 2);

      const differences = diffLines(leftStr, rightStr);
      setDiffResult(differences);
    } catch (e) {
      setError('JSON格式错误: ' + e.message);
      setDiffResult([]);
    }
  };

  // 自动比较：输入或过滤选项变化时，防抖后自动执行 diff，无需点击按钮
  useEffect(() => {
    // 两侧均为空时清空结果，不展示无意义的 diff
    if (!leftJson.trim() && !rightJson.trim()) {
      setDiffResult([]);
      setError('');
      return;
    }

    const timer = setTimeout(() => {
      compareJson();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftJson, rightJson, ignoreOptions]);

  const clearAll = () => {
    setLeftJson('');
    setRightJson('');
    setDiffResult([]);
    setError('');
    setUrl1('');
    setUrl2('');
    setLeftPath([]);
    setRightPath([]);
  };

  const generatePDFReport = async () => {
    if (!diffRef.current || diffResult.length === 0) {
      setError('没有差异结果可生成报告');
      return;
    }

    setIsGeneratingPDF(true);
    setError('');

    try {
      const dataUrl = await toPng(diffRef.current, {
        backgroundColor: '#f3f4f6',
        quality: 0.95
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (diffRef.current.scrollHeight / diffRef.current.scrollWidth) * imgWidth;

      pdf.setFont('helvetica');

      pdf.setFontSize(18);
      pdf.text('JSON差异检测报告', 105, 15, null, null, 'center');

      pdf.setFontSize(10);
      pdf.text(`生成时间: ${new Date().toLocaleString()}`, 105, 22, null, null, 'center');

      pdf.addImage(dataUrl, 'PNG', 10, 30, imgWidth, imgHeight);

      pdf.setFontSize(12);
      pdf.setTextColor(220, 53, 69);
      pdf.text('■ 删除的内容', 20, imgHeight + 35);
      pdf.setTextColor(25, 135, 84);
      pdf.text('■ 新增的内容', 70, imgHeight + 35);
      pdf.setTextColor(0, 0, 0);

      pdf.save('json-diff-report.pdf');
    } catch (err) {
      setError('生成PDF失败: ' + err.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const updateIgnoreOption = (key, value) => {
    setIgnoreOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const selectPathSuggestion = (path) => {
    // 修复：替换当前输入而不是追加
    const currentPaths = ignoreOptions.fieldPaths
        ? ignoreOptions.fieldPaths.split(',').map(p => p.trim()).filter(p => p !== '')
        : [];

    // 移除最后一个不完整的路径（如果有）
    if (currentPaths.length > 0) {
      currentPaths.pop();
    }

    // 添加新选择的路径
    currentPaths.push(path);

    // 更新为新的路径字符串
    updateIgnoreOption('fieldPaths', currentPaths.join(', '));

    setShowPathSuggestions(true);
    setTimeout(() => pathInputRef.current?.focus(), 0);
  };

  const copyDiffResult = () => {
    if (diffResult.length === 0) {
      toast.error('没有差异结果可复制');
      return;
    }

    const diffText = diffResult.map(part => part.value).join('');

    try {
      // 尝试使用现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(diffText)
            .then(() => {
              toast.success('差异结果已复制到剪贴板');
            })
            .catch(err => {
              // 备选方案：使用传统方法
              copyWithExecCommand(diffText);
            });
      } else {
        // 使用传统方法
        copyWithExecCommand(diffText);
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  // 使用传统execCommand复制文本
  const copyWithExecCommand = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        toast.success('已复制到剪贴板');
      } else {
        toast.error('复制失败: 请手动复制 (Ctrl+C)');
      }
    } catch (err) {
      document.body.removeChild(textarea);
      toast.error('复制失败: ' + err.message);
    }
  };

  // 根据状态码获取颜色类
  const getStatusColorClass = (statusCode) => {
    if (statusCode === 200) {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
    } else if (statusCode >= 500) {
      return 'bg-destructive/15 text-destructive';
    } else {
      return 'bg-muted text-muted-foreground';
    }
  };

  return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">JSON 差异比较工具</h1>

        <Card className="mb-6">
          <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setIsApiCollapsed(prev => !prev)}
          >
            <CardTitle className="flex items-center justify-between">
              <span>API 请求</span>
              {isApiCollapsed
                  ? <ChevronDown className="h-5 w-5" />
                  : <ChevronUp className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {!isApiCollapsed && (
          <CardContent>
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
            {/* 左侧URL输入框 */}
            <div className="space-y-6">
              {/* 上侧输入框 */}
              <div className="space-y-2">
                <Label>JSON1 数据源</Label>
                <div className="flex gap-2">
                  <Select value={httpMethod1} onValueChange={setHttpMethod1}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="方法" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1" ref={historyDropdownRef1}>
                    <Input
                        value={url1}
                        onChange={(e) => setUrl1(e.target.value)}
                        placeholder="输入JSON1的URL"
                        className="w-full"
                    />
                    {/* 历史记录下拉按钮 */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7"
                        onClick={async () => {
                          setShowHistory2(false);
                          if (!showHistory1) {
                            await fetchHistory(setHistoryList1, 'history1');
                          }
                          setShowHistory1(!showHistory1);
                        }}
                        disabled={loadingStates.history1}
                    >
                      {loadingStates.history1 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {/* 历史记录下拉列表 */}
                    {showHistory1 && historyList1.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {historyList1.map((item, index) => (
                              <div
                                  key={index}
                                  className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center"
                                  onClick={() => {
                                    setUrl1(item.url);
                                    setShowHistory1(false);
                                  }}
                              >
                                <span className="truncate">{item.url}</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColorClass(item.statusCode)}`}>
                            {item.statusCode === 408 ? '超时' : item.statusCode}
                          </span>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>

                  {/* 添加API请求操作按钮 */}
                  <div className="flex gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyUrl(url1)}
                        title="复制URL"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => pasteUrl(setUrl1)}
                        title="粘贴URL"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setUrl1('')}
                        title="清空URL"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                      onClick={() => fetchJsonFromUrl(url1, httpMethod1, setLeftJson, setIsLoadingLeft)}
                      disabled={isLoadingLeft}
                  >
                    {isLoadingLeft ? "请求中..." : "获取"}
                  </Button>
                </div>
              </div>

              {/* 灰色分割线 */}
              <div className="border-t border-border"></div>

              {/* 右侧URL输入框 */}
              <div className="space-y-2">
                <Label>JSON2 数据源</Label>
                <div className="flex gap-2">
                  <Select value={httpMethod2} onValueChange={setHttpMethod2}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="方法" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1" ref={historyDropdownRef2}>
                    <Input
                        value={url2}
                        onChange={(e) => setUrl2(e.target.value)}
                        placeholder="输入JSON2的URL"
                        className="w-full"
                    />
                    {/* 历史记录下拉按钮 */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7"
                        onClick={async () => {
                          setShowHistory1(false);
                          if (!showHistory2) {
                            await fetchHistory(setHistoryList2, 'history2');
                          }
                          setShowHistory2(!showHistory2);
                        }}
                        disabled={loadingStates.history2}
                    >
                      {loadingStates.history2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {/* 历史记录下拉列表 */}
                    {showHistory2 && historyList2.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {historyList2.map((item, index) => (
                              <div
                                  key={index}
                                  className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center"
                                  onClick={() => {
                                    setUrl2(item.url);
                                    setShowHistory2(false);
                                  }}
                              >
                                <span className="truncate">{item.url}</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColorClass(item.statusCode)}`}>
                            {item.statusCode === 408 ? '超时' : item.statusCode}
                          </span>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>

                  {/* 添加API请求操作按钮 */}
                  <div className="flex gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyUrl(url2)}
                        title="复制URL"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => pasteUrl(setUrl2)}
                        title="粘贴URL"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setUrl2('')}
                        title="清空URL"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                      onClick={() => fetchJsonFromUrl(url2, httpMethod2, setRightJson, setIsLoadingRight)}
                      disabled={isLoadingRight}
                  >
                    {isLoadingRight ? "请求中..." : "获取"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>提示：使用公共API时可能需要代理服务解决跨域问题</p>
            </div>
          </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>JSON 1</CardTitle>
              <div className="flex gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={formatLeftJson}
                    className="flex items-center gap-1"
                >
                  <Wand2 className="h-4 w-4" />
                  格式化
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={pasteLeftJson}
                    className="flex items-center gap-1"
                    title="粘贴到JSON1"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  粘贴
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLeftJson}
                    className="flex items-center gap-1"
                    title="复制JSON1"
                >
                  <Copy className="h-4 w-4" />
                  复制
                </Button>
                {/* 添加JSON1清空按钮 */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLeftJson('')}
                    className="flex items-center gap-1"
                    title="清空JSON1"
                >
                  <X className="h-4 w-4" />
                  清空
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 添加字段导航器 */}
              <JsonFieldNavigator
                  json={parseJsonSafely(leftJson)}
                  currentPath={leftPath}
                  onPathChange={setLeftPath}
                  onScrollToField={handleLeftScrollToField}
              />

              <Textarea
                  ref={leftTextareaRef}
                  value={leftJson}
                  onChange={(e) => setLeftJson(e.target.value)}
                  placeholder="在此粘贴第一段JSON"
                  className="min-h-[300px] font-mono"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>JSON 2</CardTitle>
              <div className="flex gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={formatRightJson}
                    className="flex items-center gap-1"
                >
                  <Wand2 className="h-4 w-4" />
                  格式化
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={pasteRightJson}
                    className="flex items-center gap-1"
                    title="粘贴到JSON2"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  粘贴
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRightJson}
                    className="flex items-center gap-1"
                    title="复制JSON2"
                >
                  <Copy className="h-4 w-4" />
                  复制
                </Button>
                {/* 添加JSON2清空按钮 */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRightJson('')}
                    className="flex items-center gap-1"
                    title="清空JSON2"
                >
                  <X className="h-4 w-4" />
                  清空
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 添加字段导航器 */}
              <JsonFieldNavigator
                  json={parseJsonSafely(rightJson)}
                  currentPath={rightPath}
                  onPathChange={setRightPath}
                  onScrollToField={handleRightScrollToField}
              />

              <Textarea
                  ref={rightTextareaRef}
                  value={rightJson}
                  onChange={(e) => setRightJson(e.target.value)}
                  placeholder="在此粘贴第二段JSON"
                  className="min-h-[300px] font-mono"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              比较过滤选项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>忽略字段路径</Label>
                  <div className="relative">
                    <Input
                        ref={pathInputRef}
                        value={ignoreOptions.fieldPaths}
                        onChange={(e) => updateIgnoreOption('fieldPaths', e.target.value)}
                        onFocus={() => setShowPathSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowPathSuggestions(false), 200)}
                        placeholder="例如: data.timestamp, user.id"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7"
                        onClick={() => setShowPathSuggestions(!showPathSuggestions)}
                    >
                      {showPathSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {showPathSuggestions && leftJson && (
                        <div className="absolute z-10 mt-1 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {fieldPathSuggestions.length > 0 ? (
                              fieldPathSuggestions.map((path, index) => (
                                  <div
                                      key={index}
                                      className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => selectPathSuggestion(path)}
                                  >
                                    {path}
                                  </div>
                              ))
                          ) : (
                              <div className="px-4 py-2 text-sm text-muted-foreground">
                                未找到匹配的字段路径
                              </div>
                          )}
                        </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">多个路径用逗号分隔</p>
                </div>

                <div>
                  <Label>正则表达式过滤</Label>
                  <Input
                      value={ignoreOptions.regexPattern}
                      onChange={(e) => updateIgnoreOption('regexPattern', e.target.value)}
                      placeholder="例如: .*\.id 忽略所有id字段"
                  />
                  <p className="text-xs text-muted-foreground mt-1">使用正则表达式匹配字段路径</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                      id="dynamic-values"
                      checked={ignoreOptions.ignoreDynamicValues}
                      onCheckedChange={(checked) => updateIgnoreOption('ignoreDynamicValues', checked)}
                  />
                  <Label htmlFor="dynamic-values">忽略动态值</Label>
                  <p className="text-xs text-muted-foreground ml-2">(时间戳、UUID等)</p>
                </div>

                <div>
                  <Label>忽略类型</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['string', 'number', 'boolean', 'null'].map(type => (
                        <Button
                            key={type}
                            variant={ignoreOptions.ignoreTypes.includes(type) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newTypes = ignoreOptions.ignoreTypes.includes(type)
                                  ? ignoreOptions.ignoreTypes.filter(t => t !== type)
                                  : [...ignoreOptions.ignoreTypes, type];
                              updateIgnoreOption('ignoreTypes', newTypes);
                            }}
                        >
                          {type}
                        </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">选择要忽略的数据类型</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mb-6">
          <Button onClick={compareJson}>比较差异</Button>
          <Button variant="outline" onClick={clearAll}>清空所有</Button>
          <Button
              onClick={generatePDFReport}
              disabled={diffResult.length === 0 || isGeneratingPDF}
              className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            {isGeneratingPDF ? "生成中..." : "生成PDF报告"}
          </Button>
        </div>

        {error && (
            <Alert variant="destructive" className="mb-6 relative">
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

        {diffResult.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>差异结果</CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyDiffResult}
                    className="flex items-center gap-1"
                >
                  <Copy className="h-4 w-4" />
                  复制结果
                </Button>
              </CardHeader>
              <CardContent>
            <pre
                ref={diffRef}
                className="bg-muted p-4 rounded-md overflow-auto max-h-[500px] border border-border"
            >
              {diffResult.map((part, index) => {
                const color = part.added ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200' :
                    part.removed ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200' : '';
                return (
                    <span key={index} className={`${color} block whitespace-pre-wrap`}>
                    {part.value}
                  </span>
                );
              })}
            </pre>
                <div className="mt-4 flex gap-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 mr-2"></div>
                    <span>删除的内容</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 mr-2"></div>
                    <span>新增的内容</span>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
  );
};

export default JsonDiffPage;