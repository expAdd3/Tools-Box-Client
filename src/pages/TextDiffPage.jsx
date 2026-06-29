import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, X, FileText, Copy } from 'lucide-react';
import { diffWordsWithSpace } from 'diff';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const splitLines = (text) => {
  const normalized = (text || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
};

const getInlineTokens = (oldLine, newLine, side) => {
  const parts = diffWordsWithSpace(oldLine, newLine);

  if (side === 'left') {
    return parts
      .filter((part) => !part.added)
      .map((part, index) => ({
        id: `l-${index}`,
        text: part.value,
        changed: Boolean(part.removed),
      }));
  }

  return parts
    .filter((part) => !part.removed)
    .map((part, index) => ({
      id: `r-${index}`,
      text: part.value,
      changed: Boolean(part.added),
    }));
};

const getCellText = (cell) => {
  if (!cell) return '';
  if (cell.inlineTokens) return cell.inlineTokens.map((token) => token.text).join('');
  return cell.text || '';
};

// 廉价行级变更代价：公共前缀 + 公共后缀，足够支撑整矩阵 NW 对齐
const getLineChangeCost = (oldLine, newLine) => {
  if (oldLine === newLine) return 0;
  const a = oldLine || '';
  const b = newLine || '';
  const aLen = a.length;
  const bLen = b.length;
  const maxPrefix = Math.min(aLen, bLen);

  let prefix = 0;
  while (prefix < maxPrefix && a[prefix] === b[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < aLen - prefix &&
    suffix < bLen - prefix &&
    a[aLen - 1 - suffix] === b[bLen - 1 - suffix]
  ) suffix += 1;

  return (aLen - prefix - suffix) + (bLen - prefix - suffix);
};

const getLineSimilarity = (oldLine, newLine) => {
  if (oldLine === newLine) return 1;
  const maxLen = Math.max(oldLine.length, newLine.length);
  if (maxLen === 0) return 1;

  const changeCost = getLineChangeCost(oldLine, newLine);
  const similarity = 1 - Math.min(changeCost, maxLen) / maxLen;
  return Math.max(0, Math.min(1, similarity));
};

const getReplacePenalty = (oldLine, newLine) => {
  const similarity = getLineSimilarity(oldLine, newLine);

  if (similarity >= 0.72) return 12;
  if (similarity >= 0.45) return 36;
  return 72;
};

// 对两段文本做基于相似度的全局对齐（Needleman-Wunsch）
const alignChangedBlocks = (removedLines, addedLines) => {
  const leftSize = removedLines.length;
  const rightSize = addedLines.length;

  if (leftSize === 0) return addedLines.map((line) => ({ kind: 'add', newLine: line }));
  if (rightSize === 0) return removedLines.map((line) => ({ kind: 'remove', oldLine: line }));

  // 超大输入退化为按位兜底，避免内存爆炸
  if (leftSize * rightSize > 2000000) {
    const maxLen = Math.max(leftSize, rightSize);
    const fallback = [];
    for (let i = 0; i < maxLen; i += 1) {
      const oldLine = removedLines[i];
      const newLine = addedLines[i];
      if (oldLine !== undefined && newLine !== undefined) {
        fallback.push({ kind: oldLine === newLine ? 'context' : 'modify', oldLine, newLine });
      } else if (oldLine !== undefined) {
        fallback.push({ kind: 'remove', oldLine });
      } else if (newLine !== undefined) {
        fallback.push({ kind: 'add', newLine });
      }
    }
    return fallback;
  }

  const gapPenalty = 32;
  const dp = Array.from({ length: leftSize + 1 }, () => Array(rightSize + 1).fill(0));
  const move = Array.from({ length: leftSize + 1 }, () => Array(rightSize + 1).fill(''));

  for (let i = 1; i <= leftSize; i += 1) {
    dp[i][0] = i * gapPenalty;
    move[i][0] = 'up';
  }
  for (let j = 1; j <= rightSize; j += 1) {
    dp[0][j] = j * gapPenalty;
    move[0][j] = 'left';
  }

  for (let i = 1; i <= leftSize; i += 1) {
    for (let j = 1; j <= rightSize; j += 1) {
      const oldLine = removedLines[i - 1];
      const newLine = addedLines[j - 1];

      const diagonalCost = dp[i - 1][j - 1] + getLineChangeCost(oldLine, newLine) + getReplacePenalty(oldLine, newLine);
      const upCost = dp[i - 1][j] + gapPenalty;
      const leftCost = dp[i][j - 1] + gapPenalty;

      let bestCost = diagonalCost;
      let bestMove = 'diag';

      if (upCost < bestCost) {
        bestCost = upCost;
        bestMove = 'up';
      }

      if (leftCost < bestCost) {
        bestCost = leftCost;
        bestMove = 'left';
      }

      dp[i][j] = bestCost;
      move[i][j] = bestMove;
    }
  }

  const aligned = [];
  let i = leftSize;
  let j = rightSize;

  while (i > 0 || j > 0) {
    const step = move[i][j];

    if (step === 'diag') {
      const oldLine = removedLines[i - 1];
      const newLine = addedLines[j - 1];
      aligned.push({ kind: oldLine === newLine ? 'context' : 'modify', oldLine, newLine });
      i -= 1;
      j -= 1;
      continue;
    }

    if (step === 'up') {
      aligned.push({ kind: 'remove', oldLine: removedLines[i - 1] });
      i -= 1;
      continue;
    }

    aligned.push({ kind: 'add', newLine: addedLines[j - 1] });
    j -= 1;
  }

  aligned.reverse();
  return aligned;
};

const buildRowsFromAligned = (aligned) => {
  const rows = [];
  const summary = { removed: 0, added: 0, modified: 0 };
  let oldLineNo = 1;
  let newLineNo = 1;

  aligned.forEach((item, index) => {
    if (item.kind === 'modify') {
      rows.push({
        id: `m-${index}`,
        left: {
          type: 'modify-remove',
          lineNo: oldLineNo,
          inlineTokens: getInlineTokens(item.oldLine, item.newLine, 'left'),
        },
        right: {
          type: 'modify-add',
          lineNo: newLineNo,
          inlineTokens: getInlineTokens(item.oldLine, item.newLine, 'right'),
        },
      });
      oldLineNo += 1;
      newLineNo += 1;
      summary.modified += 1;
      summary.removed += 1;
      summary.added += 1;
    } else if (item.kind === 'context') {
      rows.push({
        id: `c-${index}`,
        left: { type: 'context', lineNo: oldLineNo, text: item.oldLine },
        right: { type: 'context', lineNo: newLineNo, text: item.newLine },
      });
      oldLineNo += 1;
      newLineNo += 1;
    } else if (item.kind === 'remove') {
      rows.push({
        id: `r-${index}`,
        left: { type: 'remove', lineNo: oldLineNo, text: item.oldLine },
        right: null,
      });
      oldLineNo += 1;
      summary.removed += 1;
    } else {
      rows.push({
        id: `a-${index}`,
        left: null,
        right: { type: 'add', lineNo: newLineNo, text: item.newLine },
      });
      newLineNo += 1;
      summary.added += 1;
    }
  });

  return { rows, summary };
};

const copyText = (text, successMessage) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success(successMessage))
        .catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (successful) toast.success(successMessage);
          else toast.error('复制失败: 请手动复制 (Ctrl+C)');
        });
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (successful) toast.success(successMessage);
    else toast.error('复制失败: 请手动复制 (Ctrl+C)');
  } catch (err) {
    toast.error('复制失败: ' + err.message);
  }
};

const TextDiffPage = () => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [error, setError] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const diffRef = useRef(null);

  useEffect(() => {
    setError('');
  }, [leftText, rightText]);

  const { rows, summary } = useMemo(() => {
    const emptySummary = { removed: 0, added: 0, modified: 0 };
    try {
      const leftLines = splitLines(leftText);
      const rightLines = splitLines(rightText);

      if (leftLines.length === 0 && rightLines.length === 0) {
        return { rows: [], summary: emptySummary };
      }

      // 关键：对整段文本做相似度全局对齐，而不是精确相等 LCS，避免错位
      const aligned = alignChangedBlocks(leftLines, rightLines);
      return buildRowsFromAligned(aligned);
    } catch (e) {
      return { rows: [], summary: emptySummary };
    }
  }, [leftText, rightText]);

  const hasRenderableDiff = rows.length > 0;

  const clearAll = () => {
    setLeftText('');
    setRightText('');
    setError('');
  };

  const copyRemoved = () => {
    const removedText = rows
      .filter((row) => row.left && row.left.type !== 'context')
      .map((row) => getCellText(row.left))
      .join('\n');

    if (!removedText.trim()) {
      toast.error('没有删除内容可复制');
      return;
    }

    copyText(removedText, '已复制左侧差异内容');
  };

  const copyAdded = () => {
    const addedText = rows
      .filter((row) => row.right && row.right.type !== 'context')
      .map((row) => getCellText(row.right))
      .join('\n');

    if (!addedText.trim()) {
      toast.error('没有新增内容可复制');
      return;
    }

    copyText(addedText, '已复制右侧差异内容');
  };

  const generatePDFReport = async () => {
    if (!diffRef.current || !hasRenderableDiff) {
      setError('没有差异结果可生成报告');
      return;
    }

    setIsGeneratingPDF(true);
    setError('');

    try {
      const dataUrl = await toPng(diffRef.current, {
        backgroundColor: '#f3f4f6',
        quality: 0.95,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (diffRef.current.scrollHeight / diffRef.current.scrollWidth) * imgWidth;

      pdf.setFont('helvetica');
      pdf.setFontSize(18);
      pdf.text('文本差异检测报告', 105, 15, null, null, 'center');

      pdf.setFontSize(10);
      pdf.text(`生成时间: ${new Date().toLocaleString()}`, 105, 22, null, null, 'center');

      pdf.addImage(dataUrl, 'PNG', 10, 30, imgWidth, imgHeight);
      pdf.save('text-diff-report.pdf');
    } catch (err) {
      setError('生成PDF失败: ' + err.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getCellClassName = (cell) => {
    if (!cell) return 'bg-muted/30';
    if (cell.type === 'remove' || cell.type === 'modify-remove') {
      return 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100';
    }
    if (cell.type === 'add' || cell.type === 'modify-add') {
      return 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100';
    }
    return 'bg-background';
  };

  const getTokenClassName = (cellType, changed) => {
    if (!changed) return '';
    if (cellType === 'modify-remove') return 'bg-red-200 dark:bg-red-700/50 rounded-sm';
    if (cellType === 'modify-add') return 'bg-green-200 dark:bg-green-700/50 rounded-sm';
    return '';
  };

  const renderCell = (cell, side, withDivider = false) => (
    <div className={`grid grid-cols-[56px_minmax(0,1fr)] ${withDivider ? 'border-r border-border' : ''} ${getCellClassName(cell)}`}>
      <div className={`px-2 py-1 text-right select-none ${side === 'left' ? 'text-red-400 dark:text-red-300' : 'text-green-500 dark:text-green-300'}`}>
        {cell?.lineNo ?? ''}
      </div>
      <div className="px-3 py-1 whitespace-pre-wrap break-words">
        {cell?.inlineTokens
          ? cell.inlineTokens.map((token) => (
            <span key={token.id} className={getTokenClassName(cell.type, token.changed)}>
              {token.text}
            </span>
          ))
          : cell?.text || ''}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">文本差异比较工具</h1>

      {error && (
        <Alert variant="destructive" className="mb-4 relative">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>文本 1</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setLeftText('')} className="flex items-center gap-1" title="清空文本1">
              <X className="h-4 w-4" />
              清空
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              placeholder="在此粘贴第一段文本"
              className="min-h-[300px] font-mono"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>文本 2</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setRightText('')} className="flex items-center gap-1" title="清空文本2">
              <X className="h-4 w-4" />
              清空
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              placeholder="在此粘贴第二段文本"
              className="min-h-[300px] font-mono"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <Button variant="outline" onClick={clearAll}>清空所有</Button>
        <Button onClick={generatePDFReport} disabled={!hasRenderableDiff || isGeneratingPDF} className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {isGeneratingPDF ? '生成中...' : '生成PDF报告'}
        </Button>
      </div>

      {hasRenderableDiff && (
        <Card>
          <CardHeader>
            <CardTitle>差异结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-center justify-between rounded-md border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20 px-3 py-2">
                <span className="font-medium text-red-700 dark:text-red-300">- {summary.removed}</span>
                <Button variant="ghost" size="sm" onClick={copyRemoved} className="h-7 px-2 text-red-700 dark:text-red-300">
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/20 px-3 py-2">
                <span className="font-medium text-green-700 dark:text-green-300">+ {summary.added}</span>
                <Button variant="ghost" size="sm" onClick={copyAdded} className="h-7 px-2 text-green-700 dark:text-green-300">
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy
                </Button>
              </div>
            </div>

            <div ref={diffRef} className="rounded-md border border-border overflow-auto max-h-[520px] font-mono text-sm min-w-[900px]">
              <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-border bg-muted text-muted-foreground">
                <div className="px-3 py-2 border-r border-border">-</div>
                <div className="px-3 py-2">+</div>
              </div>

              {rows.map((row) => (
                <div key={row.id} className="grid grid-cols-2 border-b border-border">
                  {renderCell(row.left, 'left', true)}
                  {renderCell(row.right, 'right')}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TextDiffPage;