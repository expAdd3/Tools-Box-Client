import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';

const UnicodeConverterPage = () => {
  const [inputText, setInputText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [isValid, setIsValid] = useState(true);

  // Unicode 解码函数
  const decodeUnicode = (text) => {
    if (!text.trim()) {
      setDecodedText('');
      setFormattedText('');
      setIsValid(true);
      return;
    }

    try {
      // 处理多种 Unicode 格式
      // 1. \uXXXX 格式
      // 2. \xXX 格式
      // 3. &#XXXX; 格式
      // 4. U+XXXX 格式
      
      let result = text;
      
      // 处理 \uXXXX 格式
      result = result.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // 处理 \xXX 格式
      result = result.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // 处理 &#XXXX; 和 &#xXXXX; 格式
      result = result.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      result = result.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
      });
      
      // 处理 U+XXXX 格式
      result = result.replace(/U\+([0-9a-fA-F]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });

      // 处理纯十六进制字符串（每4个字符一个码点）
      if (/^[0-9a-fA-F]+$/.test(text.replace(/\s/g, '')) && text.replace(/\s/g, '').length % 4 === 0) {
        const hex = text.replace(/\s/g, '');
        let hexResult = '';
        for (let i = 0; i < hex.length; i += 4) {
          const codePoint = parseInt(hex.substr(i, 4), 16);
          if (!isNaN(codePoint)) {
            hexResult += String.fromCharCode(codePoint);
          }
        }
        if (hexResult) {
          result = hexResult;
        }
      }

      setDecodedText(result);
      setIsValid(true);

      // 尝试格式化 JSON（如果是 JSON 字符串）
      try {
        const jsonObj = JSON.parse(result);
        setFormattedText(JSON.stringify(jsonObj, null, 2));
      } catch {
        // 如果不是 JSON，尝试格式化包含 Unicode 的字符串
        try {
          // 将 \u 转义序列转换为实际字符
          const unescaped = result.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
          setFormattedText(unescaped);
        } catch {
          setFormattedText(result);
        }
      }
    } catch (error) {
      setIsValid(false);
      setDecodedText(text);
      setFormattedText(text);
    }
  };

  // 处理输入变化
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    decodeUnicode(text);
  };

  // 清空输入
  const clearInput = () => {
    setInputText('');
    setDecodedText('');
    setFormattedText('');
    setIsValid(true);
  };

  // 复制结果
  const copyToClipboard = (text) => {
    if (!text) {
      toast.error('没有内容可复制');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => toast.success('已复制到剪贴板'))
          .catch(() => toast.error('复制失败'));
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          toast.success('已复制到剪贴板');
        } else {
          toast.error('复制失败');
        }
      }
    } catch (err) {
      toast.error('复制失败: ' + err.message);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Unicode 解码工具</h1>

      {/* 输入区域 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>输入 Unicode 文本（自动解码）</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(inputText)}
              disabled={!inputText}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制输入
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearInput}
            >
              <X className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unicode-input">输入 Unicode 字符串</Label>
            <Textarea
              id="unicode-input"
              value={inputText}
              onChange={handleInputChange}
              placeholder="在此输入 Unicode 文本，支持多种格式：&#10;- \\u4e2d\\u6587 (\\u 格式)&#10;- \\x4e2d\\x6587 (\\x 格式)&#10;- &#20013;&#25991; (HTML 实体)&#10;- U+4E2D U+6587 (U+ 格式)&#10;- 4e2d6587 (纯十六进制)"
              className="min-h-[120px] font-mono"
            />
          </div>
          {!isValid && (
            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
              ⚠️ 输入的内容可能包含无法识别的编码格式，将原样显示
            </div>
          )}
        </CardContent>
      </Card>

      {/* 解码结果区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 直接解码结果 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>解码结果</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(decodedText)}
              disabled={!decodedText}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={decodedText}
              readOnly
              placeholder="解码后的文本将显示在这里"
              className="min-h-[200px] font-mono bg-muted"
            />
          </CardContent>
        </Card>

        {/* 格式化结果 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>格式化结果</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(formattedText)}
              disabled={!formattedText}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formattedText}
              readOnly
              placeholder="格式化后的文本将显示在这里（如果是 JSON 会自动格式化）"
              className="min-h-[200px] font-mono bg-muted"
            />
          </CardContent>
        </Card>
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>本工具支持自动解码多种 Unicode 编码格式，无需点击按钮，输入后自动转换：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-muted px-1 rounded">\uXXXX</code> 格式：如 <code className="bg-muted px-1 rounded">\u4e2d\u6587</code> 解码为"中文"</li>
              <li><code className="bg-muted px-1 rounded">\xXX</code> 格式：如 <code className="bg-muted px-1 rounded">\x4e\x2d</code> 解码为"中"</li>
              <li><code className="bg-muted px-1 rounded">&amp;#XXXX;</code> HTML 实体：如 <code className="bg-muted px-1 rounded">&amp;#20013;&amp;#25991;</code> 解码为"中文"</li>
              <li><code className="bg-muted px-1 rounded">&amp;#xXXXX;</code> 十六进制 HTML 实体：如 <code className="bg-muted px-1 rounded">&amp;#x4e2d;&amp;#x6587;</code> 解码为"中文"</li>
              <li><code className="bg-muted px-1 rounded">U+XXXX</code> 格式：如 <code className="bg-muted px-1 rounded">U+4E2D U+6587</code> 解码为"中文"</li>
              <li><code className="bg-muted px-1 rounded">纯十六进制</code>：如 <code className="bg-muted px-1 rounded">4e2d 6587</code> 解码为"中文"</li>
            </ul>
            <p className="text-muted-foreground mt-2">💡 提示：如果输入的内容是 JSON 字符串，格式化结果会自动美化显示</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnicodeConverterPage;
