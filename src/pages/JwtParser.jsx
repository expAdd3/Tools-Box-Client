import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';

const JwtParser = () => {
  const [jwt, setJwt] = useState('');
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');

  const parseJwt = () => {
    try {
      setError('');
      const parts = jwt.split('.');
      
      if (parts.length !== 3) {
        throw new Error('无效的 JWT 格式');
      }

      const [headerPart, payloadPart, signaturePart] = parts;

      const decodedHeader = JSON.parse(atob(headerPart));
      const decodedPayload = JSON.parse(atob(payloadPart));

      setHeader(JSON.stringify(decodedHeader, null, 2));
      setPayload(JSON.stringify(decodedPayload, null, 2));
      setSignature(signaturePart);

      toast.success('JWT 解析成功');
    } catch (err) {
      setError('解析失败: ' + err.message);
      setHeader('');
      setPayload('');
      setSignature('');
      toast.error('JWT 解析失败');
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) {
      toast.error(`没有${label}可复制`);
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label}已复制到剪贴板`))
      .catch(() => toast.error('复制失败'));
  };

  const clearAll = () => {
    setJwt('');
    setHeader('');
    setPayload('');
    setSignature('');
    setError('');
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">JWT 解析工具</h1>

      <Card>
        <CardHeader>
          <CardTitle>输入 JWT Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jwt-input">JWT Token</Label>
            <Textarea
              id="jwt-input"
              value={jwt}
              onChange={(e) => setJwt(e.target.value)}
              placeholder="粘贴 JWT Token..."
              className="min-h-[100px] font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={parseJwt}>解析 JWT</Button>
            <Button variant="outline" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {(header || payload || signature) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Header</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(header, 'Header')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={header}
                readOnly
                className="min-h-[150px] font-mono bg-muted"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payload</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(payload, 'Payload')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={payload}
                readOnly
                className="min-h-[150px] font-mono bg-muted"
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Signature</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(signature, 'Signature')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={signature}
                readOnly
                className="min-h-[80px] font-mono bg-muted"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default JwtParser;
