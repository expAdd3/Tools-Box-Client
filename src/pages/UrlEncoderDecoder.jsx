import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';

const UrlEncoderDecoder = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState('');

  const encodeUrl = () => {
    try {
      setError('');
      const encoded = encodeURIComponent(inputText);
      setOutputText(encoded);
      toast.success('URL 编码成功');
    } catch (err) {
      setError('编码失败: ' + err.message);
      toast.error('编码失败');
    }
  };

  const decodeUrl = () => {
    try {
      setError('');
      const decoded = decodeURIComponent(inputText);
      setOutputText(decoded);
      toast.success('URL 解码成功');
    } catch (err) {
      setError('解码失败:请确保输入的是有效的 URL 编码字符串');
      toast.error('解码失败');
    }
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
    setError('');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">URL 编解码工具</h1>

      <Tabs defaultValue="encode" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="encode">编码</TabsTrigger>
          <TabsTrigger value="decode">解码</TabsTrigger>
        </TabsList>

        <TabsContent value="encode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL 编码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="encode-input">输入文本</Label>
                <Textarea
                  id="encode-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入要编码的文本..."
                  className="min-h-[150px]"
                />
              </div>
              <Button onClick={encodeUrl} className="w-full">
                URL 编码
              </Button></CardContent>
          </Card></TabsContent>

        <TabsContent value="decode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL 解码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decode-input">输入 URL 编码</Label>
                <Textarea
                  id="decode-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入要解码的 URL 编码字符串..."
                  className="min-h-[150px]"
                />
              </div>
              <Button onClick={decodeUrl} className="w-full">
                URL 解码
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Card className="mt-4 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {outputText && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>结果</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <X className="h-4 w-4 mr-1" />
                清空
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={outputText}
              readOnly
              className="min-h-[150px] bg-muted"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UrlEncoderDecoder;
