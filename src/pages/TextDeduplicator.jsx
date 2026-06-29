import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Copy, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const TextDeduplicator = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [removedCount, setRemovedCount] = useState(0);

  const deduplicateText = () => {
    if (!inputText.trim()) {
      toast.error('请输入文本');
      return;
    }

    const lines = inputText.split('\n');
    const uniqueLines = [...new Set(lines)];
    const removed = lines.length - uniqueLines.length;

    setOutputText(uniqueLines.join('\n'));
    setRemovedCount(removed);
    toast.success(`已去除 ${removed} 行重复内容`);
  };

  const copyToClipboard = () => {
    if (!outputText) {
      toast.error('没有内容可复制');
      return;
    }
    navigator.clipboard.writeText(outputText)
      .then(() => toast.success('已复制到剪贴板'))
      .catch(() => toast.error('复制失败'));
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setRemovedCount(0);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">文本去重工具</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>输入文本</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input">输入要去重的文本（每行一条）</Label>
              <Textarea
                id="input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="输入文本，每行一条记录..."
                className="min-h-[300px] font-mono"
              />
            </div></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>去重结果</CardTitle>
            {outputText && (
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4"><Textarea
              value={outputText}
              readOnly
              placeholder="去重后的结果将显示在这里..."
              className="min-h-[300px] font-mono bg-muted"
            />
            {removedCount > 0 && (
              <div className="text-sm text-muted-foreground">
                已去除 {removedCount} 行重复内容
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={deduplicateText}>
          <Wand2 className="h-4 w-4 mr-1" />
          开始去重
        </Button>
        <Button variant="outline" onClick={clearAll}>
          <X className="h-4 w-4 mr-1" />
          清空所有
        </Button>
      </div>
    </div>
  );
};

export default TextDeduplicator;
