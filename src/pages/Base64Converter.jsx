import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';

const STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const encodeUtf8Base64 = (text) => btoa(unescape(encodeURIComponent(text)));
const decodeUtf8Base64 = (text) => decodeURIComponent(escape(atob(text)));

const validateCustomAlphabet = (alphabet) => {
  if (!alphabet) return '';
  if (alphabet.length !== 64) return 'base64_list 长度必须为 64';
  if (/\s/.test(alphabet)) return 'base64_list 不能包含空白字符';
  if (alphabet.includes('=')) return 'base64_list 不能包含 =';
  if (new Set(alphabet).size !== 64) return 'base64_list 字符不能重复';
  return '';
};

const translateStandardToCustom = (base64, customAlphabet) => {
  if (!customAlphabet) return base64;
  return base64
    .split('')
    .map((ch) => {
      if (ch === '=') return ch;
      const index = STANDARD_ALPHABET.indexOf(ch);
      if (index === -1) return ch;
      return customAlphabet[index];
    })
    .join('');
};

const translateCustomToStandard = (base64, customAlphabet) => {
  if (!customAlphabet) return base64;
  return base64
    .split('')
    .map((ch) => {
      if (ch === '=') return ch;
      const index = customAlphabet.indexOf(ch);
      if (index === -1) {
        throw new Error(`字符 "${ch}" 不在 base64_list 中`);
      }
      return STANDARD_ALPHABET[index];
    })
    .join('');
};

const Base64Converter = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState('');
  const [customAlphabet, setCustomAlphabet] = useState('');

  const getValidatedCustomAlphabet = () => {
    const trimmed = customAlphabet.trim();
    const validationError = validateCustomAlphabet(trimmed);
    if (validationError) {
      throw new Error(validationError);
    }
    return trimmed;
  };

  const encodeBase64 = () => {
    try {
      setError('');
      const custom = getValidatedCustomAlphabet();
      const encoded = encodeUtf8Base64(inputText);
      setOutputText(translateStandardToCustom(encoded, custom));
      toast.success('编码成功');
    } catch (err) {
      setError('编码失败: ' + err.message);
      toast.error('编码失败');
    }
  };

  const decodeBase64 = () => {
    try {
      setError('');
      const custom = getValidatedCustomAlphabet();
      const normalized = translateCustomToStandard(inputText, custom);
      const decoded = decodeUtf8Base64(normalized);
      setOutputText(decoded);
      toast.success('解码成功');
    } catch (err) {
      setError('解码失败: ' + err.message);
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
      <h1 className="text-3xl font-bold mb-6">Base64 转换工具</h1>

      <Tabs defaultValue="encode" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="encode">编码</TabsTrigger>
          <TabsTrigger value="decode">解码</TabsTrigger>
        </TabsList>

        <TabsContent value="encode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>文本编码为 Base64</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="encode-input">输入文本</Label>
                <Textarea
                  id="encode-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入要编码的文本..."
                  className="min-h-[220px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base64-list-encode">base64_list（可选）</Label>
                <Input
                  id="base64-list-encode"
                  value={customAlphabet}
                  onChange={(e) => setCustomAlphabet(e.target.value)}
                  placeholder="留空使用标准 Base64，或输入 64 位自定义字符集"
                />
                <p className="text-sm text-muted-foreground">规则：长度必须为 64，字符不可重复，不能包含空白和 =。</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setCustomAlphabet(URL_SAFE_ALPHABET)}>
                    使用 URL-safe 字符集
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setCustomAlphabet('')}>
                    恢复标准（留空）
                  </Button>
                </div>
              </div>

              <Button onClick={encodeBase64} className="w-full">
                编码为 Base64
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Base64 解码为文本</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decode-input">输入 Base64</Label>
                <Textarea
                  id="decode-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入要解码的 Base64 字符串..."
                  className="min-h-[220px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base64-list-decode">base64_list（可选）</Label>
                <Input
                  id="base64-list-decode"
                  value={customAlphabet}
                  onChange={(e) => setCustomAlphabet(e.target.value)}
                  placeholder="留空使用标准 Base64，或输入 64 位自定义字符集"
                />
                <p className="text-sm text-muted-foreground">规则：长度必须为 64，字符不可重复，不能包含空白和 =。</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setCustomAlphabet(URL_SAFE_ALPHABET)}>
                    使用 URL-safe 字符集
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setCustomAlphabet('')}>
                    恢复标准（留空）
                  </Button>
                </div>
              </div>

              <Button onClick={decodeBase64} className="w-full">
                解码 Base64
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

export default Base64Converter;
