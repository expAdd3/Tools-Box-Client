// 统一工具页面布局：标题 + 输入区 + 输出区 + 操作栏
// 所有新增工具都使用此组件包裹，保证风格一致
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, X, Wand2 } from 'lucide-react';

const ToolLayout = ({ 
  title, 
  description,
  inputArea, 
  outputArea, 
  onProcess, 
  onClear,
  processText = '执行转换',
  isProcessing = false,
  error = null
}) => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>输入</CardTitle>
            <Button variant="outline" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              清空
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {inputArea}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>输出</CardTitle>
            {outputArea && (
              <Button variant="outline" size="sm" onClick={() => {
                const text = typeof outputArea === 'string' ? outputArea : outputArea.props?.value;
                if (text) navigator.clipboard.writeText(text);
              }}>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {outputArea}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={onProcess} disabled={isProcessing} className="flex items-center gap-1">
          <Wand2 className="h-4 w-4" />
          {isProcessing ? '处理中...' : processText}
        </Button>
        <Button variant="outline" onClick={onClear}>清空所有</Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ToolLayout;
