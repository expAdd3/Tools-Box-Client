import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Terminal, X, Copy } from 'lucide-react';
import { diffWordsWithSpace } from 'diff';
import { toast } from 'sonner';

// 把字面量转义(\n、\r\n、\t)展开为真实字符
const expandEscaped = (text) => {
  if (!text) return '';
  return text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
};

// expandEscaped 的逆操作:把真实换行/制表符折叠回字面量,保证开关可逆
const collapseEscaped = (text) => {
  if (!text) return '';
  return text
    .replace(/\t/g, '\\t')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n');
};

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
  // 展开转义换行开关:开=按真实多行显示/比较;关=保留原始字面量 \n。可逆无损。
  const [expandNewlines, setExpandNewlines] = useState(false);

  const leftOverlayRef = useRef(null);
  const rightOverlayRef = useRef(null);

  useEffect(() => {
    setError('');
  }, [leftText, rightText]);

  // 参与显示与 diff 的实际文本:开关打开时展开转义,否则用原文
  const displayLeft = useMemo(
    () => (expandNewlines ? expandEscaped(leftText) : leftText),
    [leftText, expandNewlines],
  );
  const displayRight = useMemo(
    () => (expandNewlines ? expandEscaped(rightText) : rightText),
    [rightText, expandNewlines],
  );

  const { rows, summary } = useMemo(() => {
    const emptySummary = { removed: 0, added: 0, modified: 0 };
    try {
      const leftLines = splitLines(displayLeft);
      const rightLines = splitLines(displayRight);

      if (leftLines.length === 0 && rightLines.length === 0) {
        return { rows: [], summary: emptySummary };
      }

      // 关键：对整段文本做相似度全局对齐，而不是精确相等 LCS，避免错位
      const aligned = alignChangedBlocks(leftLines, rightLines);
      return buildRowsFromAligned(aligned);
    } catch (e) {
      return { rows: [], summary: emptySummary };
    }
  }, [displayLeft, displayRight]);

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

  // 编辑写回:展开模式下用户看到的是真实换行,折叠回字面量再存,保证 source 一致可逆
  const makeChangeHandler = (setter) => (nextValue) => {
    setter(expandNewlines ? collapseEscaped(nextValue) : nextValue);
  };

  // 每一侧的实际行装饰:按对齐结果里"含该侧内容"的行取出,顺序与 textarea 原始行一一对应
  const leftDecorations = useMemo(
    () => rows.filter((row) => row.left).map((row) => row.left),
    [rows],
  );
  const rightDecorations = useMemo(
    () => rows.filter((row) => row.right).map((row) => row.right),
    [rows],
  );

  // 整行底色(叠在输入框文字后面)
  const getLineBgClass = (cell) => {
    if (!cell) return '';
    if (cell.type === 'remove' || cell.type === 'modify-remove') {
      return 'bg-red-100/80 dark:bg-red-900/30';
    }
    if (cell.type === 'add' || cell.type === 'modify-add') {
      return 'bg-green-100/80 dark:bg-green-900/30';
    }
    return '';
  };

  const getTokenClassName = (cellType, changed) => {
    if (!changed) return '';
    if (cellType === 'modify-remove') return 'bg-red-300/70 dark:bg-red-600/50 rounded-sm';
    if (cellType === 'modify-add') return 'bg-green-300/70 dark:bg-green-600/50 rounded-sm';
    return '';
  };

  const renderOverlayLines = (decorations) => (
    decorations.map((cell, index) => (
      <div key={`${index}-${cell.type}`} className={getLineBgClass(cell)}>
        {cell.inlineTokens
          ? cell.inlineTokens.map((token) => (
            <span key={token.id} className={getTokenClassName(cell.type, token.changed)}>
              {token.text}
            </span>
          ))
          : (cell.text && cell.text.length > 0 ? cell.text : '​')}
      </div>
    ))
  );

  // 输入框与其高亮层共用的排版类,必须完全一致才能对齐
  const paneTypography = 'font-mono text-sm leading-6 whitespace-pre-wrap break-words p-3';

  const syncScroll = (overlayRef) => (e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
      overlayRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const renderPane = ({ title, value, onChange, decorations, overlayRef, placeholder, onClear }) => (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center py-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onClear} className="flex items-center gap-1" title={`清空${title}`}>
          <X className="h-4 w-4" />
          清空
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-md border border-border overflow-hidden">
          {/* 高亮层:显示文字与差异底色,位于底层 */}
          <div
            ref={overlayRef}
            aria-hidden="true"
            className={`absolute inset-0 overflow-hidden text-foreground ${paneTypography}`}
          >
            {decorations.length > 0
              ? renderOverlayLines(decorations)
              : null}
          </div>
          {/* 编辑层:透明文字,只保留光标,叠在高亮层之上 */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll(overlayRef)}
            placeholder={placeholder}
            spellCheck={false}
            className={`relative w-full min-h-[360px] bg-transparent text-transparent caret-foreground resize-y outline-none placeholder:text-muted-foreground ${paneTypography}`}
          />
        </div>
      </CardContent>
    </Card>
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

      {hasRenderableDiff && (
        <div className="grid grid-cols-2 gap-6 mb-3">
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
      )}

      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="expand-newlines"
          checked={expandNewlines}
          onCheckedChange={setExpandNewlines}
        />
        <Label htmlFor="expand-newlines" className="cursor-pointer select-none">
          展开 \n 为换行
        </Label>
        <span className="text-sm text-muted-foreground">
          {expandNewlines ? '当前:按真实多行显示与比较' : '当前:保留原始文本'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {renderPane({
          title: '文本 1',
          value: displayLeft,
          onChange: makeChangeHandler(setLeftText),
          decorations: leftDecorations,
          overlayRef: leftOverlayRef,
          placeholder: '在此粘贴第一段文本',
          onClear: () => setLeftText(''),
        })}
        {renderPane({
          title: '文本 2',
          value: displayRight,
          onChange: makeChangeHandler(setRightText),
          decorations: rightDecorations,
          overlayRef: rightOverlayRef,
          placeholder: '在此粘贴第二段文本',
          onClear: () => setRightText(''),
        })}
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={clearAll}>清空所有</Button>
      </div>
    </div>
  );
};

export default TextDiffPage;