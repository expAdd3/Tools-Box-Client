import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const UuidGenerator = () => {
  const [uuid, setUuid] = useState('');
  const [count, setCount] = useState(1);
  const [uuidList, setUuidList] = useState([]);

  const generateUUID = () => {
    return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const generateSingle = () => {
    const newUuid = generateUUID();
    setUuid(newUuid);
    toast.success('UUID 已生成');
  };

  const generateMultiple = () => {
    const newList = Array.from({ length: count }, () => generateUUID());
    setUuidList(newList);
    toast.success(`已生成 ${count} 个 UUID`);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('已复制到剪贴板'))
      .catch(() => toast.error('复制失败'));
  };

  const copyAll = () => {
    const allUuids = uuidList.join('\n');
    copyToClipboard(allUuids);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">UUID 生成器</h1>

      <Card>
        <CardHeader>
          <CardTitle>生成单个 UUID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={uuid} readOnly placeholder="点击生成 UUID" className="flex-1" />
            <Button onClick={generateSingle}><RefreshCw className="h-4 w-4 mr-1" />
              生成
            </Button>
            {uuid && (
              <Button variant="outline" onClick={() => copyToClipboard(uuid)}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>批量生成 UUID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="count">生成数量</Label>
            <div className="flex gap-2">
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="flex-1"
              />
              <Button onClick={generateMultiple}>
                <RefreshCw className="h-4 w-4 mr-1" />
                生成
              </Button>
            </div>
          </div>

          {uuidList.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>生成结果</Label>
                <Button variant="outline" size="sm" onClick={copyAll}>
                  <Copy className="h-4 w-4 mr-1" />
                  复制全部
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md p-3space-y-1bg-gray-50">
                {uuidList.map((id, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 py-1">
                    <code className="text-sm flex-1">{id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UuidGenerator;
