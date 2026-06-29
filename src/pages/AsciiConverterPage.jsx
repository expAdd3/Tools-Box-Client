import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AsciiConverterPage = () => {
  const [inputText, setInputText] = useState('');
  const [asciiResult, setAsciiResult] = useState([]);

  // 自动转换字符为 ASCII 码
  const convertToAscii = (text) => {
    if (!text) {
      setAsciiResult([]);
      return;
    }

    const result = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charCode = char.charCodeAt(0);
      result.push({
        char: char,
        dec: charCode,
        hex: charCode.toString(16).toUpperCase().padStart(2, '0'),
        oct: charCode.toString(8).padStart(3, '0'),
        bin: charCode.toString(2).padStart(8, '0'),
        html: `&#${charCode};`,
        isControl: charCode < 32 || charCode === 127
      });
    }
    setAsciiResult(result);
  };

  // 处理输入变化
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    convertToAscii(text);
  };

  // 清空输入
  const clearInput = () => {
    setInputText('');
    setAsciiResult([]);
  };

  // 复制单个结果
  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('已复制到剪贴板');
      }).catch(() => {
        toast.error('复制失败');
      });
    }
  };

  // 复制所有结果
  const copyAllResults = () => {
    if (asciiResult.length === 0) return;
    const allText = asciiResult.map(item => `${item.char}: ${item.dec}`).join(', ');
    copyToClipboard(allText);
  };

  // 生成 ASCII 码表数据
  const generateAsciiTable = () => {
    const table = [];
    // 控制字符 (0-31) 和 DEL (127)
    const controlChars = {
      0: 'NUL (空字符)',
      1: 'SOH (标题开始)',
      2: 'STX (正文开始)',
      3: 'ETX (正文结束)',
      4: 'EOT (传输结束)',
      5: 'ENQ (询问)',
      6: 'ACK (确认)',
      7: 'BEL (响铃)',
      8: 'BS (退格)',
      9: 'HT (水平制表)',
      10: 'LF (换行)',
      11: 'VT (垂直制表)',
      12: 'FF (换页)',
      13: 'CR (回车)',
      14: 'SO (移出)',
      15: 'SI (移入)',
      16: 'DLE (数据链路转义)',
      17: 'DC1 (设备控制1)',
      18: 'DC2 (设备控制2)',
      19: 'DC3 (设备控制3)',
      20: 'DC4 (设备控制4)',
      21: 'NAK (否定确认)',
      22: 'SYN (同步空闲)',
      23: 'ETB (传输块结束)',
      24: 'CAN (取消)',
      25: 'EM (介质结束)',
      26: 'SUB (替换)',
      27: 'ESC (转义)',
      28: 'FS (文件分隔符)',
      29: 'GS (组分隔符)',
      30: 'RS (记录分隔符)',
      31: 'US (单元分隔符)',
      127: 'DEL (删除)'
    };

    // 可打印字符 (32-126)
    for (let i = 32; i <= 126; i++) {
      table.push({
        dec: i,
        hex: i.toString(16).toUpperCase().padStart(2, '0'),
        oct: i.toString(8).padStart(3, '0'),
        char: String.fromCharCode(i),
        description: ''
      });
    }

    return { controlChars, printableChars: table };
  };

  const { controlChars, printableChars } = generateAsciiTable();

  // 渲染控制字符表格
  const renderControlCharsTable = () => {
    const controlKeys = Object.keys(controlChars).map(Number).sort((a, b) => a - b);
    const rows = [];
    for (let i = 0; i < controlKeys.length; i += 2) {
      rows.push(controlKeys.slice(i, i + 2));
    }

    const renderCodeCells = (code, keyPrefix) => {
      if (code === undefined) {
        return (
          <React.Fragment key={`${keyPrefix}-empty`}>
            <td className="px-2 py-1" />
            <td className="px-2 py-1" />
            <td className="px-2 py-1" />
            <td className="px-2 py-1" />
          </React.Fragment>
        );
      }

      return (
        <React.Fragment key={`${keyPrefix}-${code}`}>
          <td className="px-2 py-1 font-mono text-blue-600">{code}</td>
          <td className="px-2 py-1 font-mono text-purple-600">{code.toString(16).toUpperCase().padStart(2, '0')}</td>
          <td className="px-2 py-1 font-mono text-orange-600">{code.toString(8).padStart(3, '0')}</td>
          <td className="px-2 py-1 text-muted-foreground text-xs">{controlChars[code]}</td>
        </React.Fragment>
      );
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-2 py-2 text-left font-medium text-foreground">十进制</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">十六进制</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">八进制</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">字符</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">十进制</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">十六进制</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">八进制</th>
              <th className="px-2 py-2 text-left font-medium text-foreground">字符</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border hover:bg-muted">
                {renderCodeCells(row[0], `${rowIndex}-left`)}
                {renderCodeCells(row[1], `${rowIndex}-right`)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">ASCII 码转换工具</h1>

      {/* 字符转换区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>字符转 ASCII 码（自动转换）</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyAllResults}
                disabled={asciiResult.length === 0}
              >
                <Copy className="h-4 w-4 mr-1" />
                复制全部
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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ascii-input">输入字符</Label>
            <Input
              id="ascii-input"
              value={inputText}
              onChange={handleInputChange}
              placeholder="在此输入字符，自动转换为 ASCII 码..."
              className="w-full"
            />
          </div>

          {asciiResult.length > 0 && (
            <div className="space-y-2">
              <Label>转换结果</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">字符</th>
                      <th className="px-4 py-2 text-left font-medium">十进制</th>
                      <th className="px-4 py-2 text-left font-medium">十六进制</th>
                      <th className="px-4 py-2 text-left font-medium">八进制</th>
                      <th className="px-4 py-2 text-left font-medium">二进制</th>
                      <th className="px-4 py-2 text-left font-medium">HTML 实体</th>
                      <th className="px-4 py-2 text-left font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asciiResult.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-muted">
                        <td className="px-4 py-2 font-mono text-lg">
                          {item.isControl ? (
                            <span className="text-muted-foreground text-xs">控制字符</span>
                          ) : (
                            <span className="font-bold text-blue-600">{item.char}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-green-600">{item.dec}</td>
                        <td className="px-4 py-2 font-mono text-purple-600">0x{item.hex}</td>
                        <td className="px-4 py-2 font-mono text-orange-600">{item.oct}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground">{item.bin}</td>
                        <td className="px-4 py-2 font-mono text-pink-600">{item.html}</td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(item.dec.toString())}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {asciiResult.length === 0 && (
            <div className="text-center py-8 text-muted-foreground bg-muted rounded-lg">
              输入字符后将自动显示 ASCII 码转换结果
            </div>
          )}
        </CardContent>
      </Card>

      {/* ASCII 码表区域 */}
      <Card>
        <CardHeader>
          <CardTitle>ASCII 码表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 控制字符表 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">控制字符 (0-31, 127)</h3>
            {renderControlCharsTable()}
          </div>

          {/* 可打印字符表 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">可打印字符 (32-126)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-2 py-2 text-left font-medium text-foreground">十进制</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">十六进制</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">八进制</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">字符</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">十进制</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">十六进制</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">八进制</th>
                    <th className="px-2 py-2 text-left font-medium text-foreground">字符</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(printableChars.length / 2) }, (_, i) => {
                    const left = printableChars[i];
                    const right = printableChars[i + Math.ceil(printableChars.length / 2)];
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted">
                        <td className="px-2 py-1 font-mono text-blue-600">{left.dec}</td>
                        <td className="px-2 py-1 font-mono text-purple-600">{left.hex}</td>
                        <td className="px-2 py-1 font-mono text-orange-600">{left.oct}</td>
                        <td className="px-2 py-1 font-bold text-green-600">{left.char}</td>
                        {right && (
                          <>
                            <td className="px-2 py-1 font-mono text-blue-600">{right.dec}</td>
                            <td className="px-2 py-1 font-mono text-purple-600">{right.hex}</td>
                            <td className="px-2 py-1 font-mono text-orange-600">{right.oct}</td>
                            <td className="px-2 py-1 font-bold text-green-600">{right.char}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ASCII 码说明 */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-blue-800">ASCII 码说明</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
              <li>ASCII (American Standard Code for Information Interchange) 是基于拉丁字母的一套电脑编码系统</li>
              <li>标准 ASCII 码使用 7 位二进制数表示，共 128 个字符 (0-127)</li>
              <li>0-31 和 127 是控制字符，用于控制打印机等设备</li>
              <li>32-126 是可打印字符，包括数字、字母、标点符号等</li>
              <li>48-57: 数字 0-9</li>
              <li>65-90: 大写字母 A-Z</li>
              <li>97-122: 小写字母 a-z</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AsciiConverterPage;
