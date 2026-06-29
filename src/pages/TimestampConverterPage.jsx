import { Input } from '@/components/ui/input';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PopoverContent, Popover, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Copy, Clock, ClipboardPaste, X } from 'lucide-react';
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const TimestampConverterPage = () => {
  const [activeTab, setActiveTab] = useState("timestamp-to-date");
  const [timestamp, setTimestamp] = useState('');
  const [date, setDate] = useState(new Date());
  const [convertedDate, setConvertedDate] = useState('');
  const [convertedTimestamp, setConvertedTimestamp] = useState('');
  const [dateInput, setDateInput] = useState('');

  // 时间戳转日期
  const convertTimestampToDate = () => {
    try {
      let ts = parseInt(timestamp);
      
      // 处理13位时间戳（毫秒）
      if (ts.toString().length === 13) {
        ts = Math.floor(ts / 1000);
      }
      
      const dateObj = new Date(ts * 1000);
      const formattedDate = format(dateObj, 'yyyy-MM-dd HH:mm:ss');
      setConvertedDate(formattedDate);
    } catch (error) {
      toast.error('转换失败: 请输入有效的时间戳');
    }
  };

  // 日期转时间戳
  const convertDateToTimestamp = () => {
    try {
      const timestamp = Math.floor(date.getTime() / 1000);
      setConvertedTimestamp(timestamp.toString());
    } catch (error) {
      toast.error('转换失败: 请选择有效的日期');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text) => {
    if (!text) {
      toast.error('没有内容可复制');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            toast.success('已复制到剪贴板');
          })
          .catch(err => {
            copyWithExecCommand(text);
          });
      } else {
        copyWithExecCommand(text);
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  // 使用传统方法复制
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

  // 粘贴时间戳
  const pasteTimestamp = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setTimestamp(text);
        toast.success('已粘贴时间戳');
      } else {
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();

        if (document.execCommand('paste')) {
          setTimestamp(textarea.value);
          toast.success('已粘贴时间戳');
        } else {
          toast.error('粘贴失败: 请手动粘贴 (Ctrl+V)');
        }

        document.body.removeChild(textarea);
      }
    } catch (err) {
      toast.error('粘贴失败: ' + err.message);
    }
  };

  // 清空时间戳输入
  const clearTimestamp = () => {
    setTimestamp('');
    setConvertedDate('');
  };

  // 清空日期选择
  const clearDate = () => {
    setDate(new Date());
    setConvertedTimestamp('');
    setDateInput('');
  };

  // 获取当前时间戳
  const getCurrentTimestamp = () => {
    const now = Math.floor(Date.now() / 1000);
    setTimestamp(now.toString());
  };

  // 获取当前日期时间
  const getCurrentDateTime = () => {
    const now = new Date();
    setDate(now);
    setDateInput(format(now, 'yyyy-MM-dd HH:mm:ss'));
  };

  // 解析手动输入的日期时间字符串
  const handleDateInputChange = (e) => {
    const value = e.target.value;
    setDateInput(value);

    if (!value.trim()) {
      return;
    }

    // 将空格格式替换为 ISO 格式以便解析
    const normalized = value.trim().replace(' ', 'T');
    const parsed = new Date(normalized);

    if (!isNaN(parsed.getTime())) {
      setDate(parsed);
      setConvertedTimestamp('');
    } else {
      toast.error('日期格式错误，请使用 yyyy-MM-dd HH:mm:ss 格式');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">时间戳转换工具</h1>

      <Card>
        <CardHeader>
          <CardTitle>时间戳 ⇄ 日期时间 转换</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timestamp-to-date">时间戳转日期</TabsTrigger>
              <TabsTrigger value="date-to-timestamp">日期转时间戳</TabsTrigger>
            </TabsList>
            
            <TabsContent value="timestamp-to-date" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timestamp">时间戳 (秒或毫秒)</Label>
                <div className="flex gap-2">
                  <Input
                    id="timestamp"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    placeholder="输入时间戳，例如: 1625097600"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={pasteTimestamp}
                    title="粘贴时间戳"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={getCurrentTimestamp}
                    title="获取当前时间戳"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={clearTimestamp}
                    title="清空时间戳"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Button onClick={convertTimestampToDate} className="w-full">
                转换为日期时间
              </Button>
              
              {convertedDate && (
                <div className="space-y-2">
                  <Label>转换结果</Label>
                  <div className="flex gap-2">
                    <Input
                      value={convertedDate}
                      readOnly
                      className="flex-1 bg-muted"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(convertedDate)}
                      title="复制日期"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="date-to-timestamp" className="space-y-4">
              <div className="space-y-2">
                <Label>选择日期和时间</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'yyyy-MM-dd HH:mm:ss') : '选择日期和时间'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          if (newDate) {
                            setDate(newDate);
                            setDateInput(format(newDate, 'yyyy-MM-dd HH:mm:ss'));
                            setConvertedTimestamp('');
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={getCurrentDateTime}
                    title="获取当前日期时间"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={clearDate}
                    title="清空日期"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-input">或手动输入日期时间</Label>
                <Input
                  id="date-input"
                  value={dateInput}
                  onChange={handleDateInputChange}
                  placeholder="例如: 2026-06-17 18:26:00"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  支持格式: yyyy-MM-dd HH:mm:ss
                </p>
              </div>
              
              <Button onClick={convertDateToTimestamp} className="w-full">
                转换为时间戳
              </Button>
              
              {convertedTimestamp && (
                <div className="space-y-2">
                  <Label>转换结果</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex items-center bg-muted rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
                        秒级
                      </div>
                      <Input
                        value={convertedTimestamp}
                        readOnly
                        className="flex-1 bg-muted"
                        placeholder="秒级时间戳"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(convertedTimestamp)}
                        title="复制秒级时间戳"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center bg-muted rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
                        毫秒级
                      </div>
                      <Input
                        value={(parseInt(convertedTimestamp) * 1000).toString()}
                        readOnly
                        className="flex-1 bg-muted"
                        placeholder="毫秒级时间戳"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard((parseInt(convertedTimestamp) * 1000).toString())}
                        title="复制毫秒级时间戳"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-2">
                    <p>秒级时间戳: {convertedTimestamp}</p>
                    <p>毫秒级时间戳: {(parseInt(convertedTimestamp) * 1000).toString()}</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>时间戳转日期: 输入秒级或毫秒级时间戳，转换为可读的日期时间格式</li>
            <li>日期转时间戳: 通过日历选择日期，或手动输入日期时间（格式: yyyy-MM-dd HH:mm:ss），转换为Unix时间戳</li>
            <li>支持复制转换结果到剪贴板</li>
            <li>可以使用当前时间戳或当前日期时间快速填充</li>
            <li>可以使用清空按钮快速清除输入内容</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimestampConverterPage;
