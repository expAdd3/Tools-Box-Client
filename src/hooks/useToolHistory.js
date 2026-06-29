// 基于 localStorage 的输入历史管理 Hook
// 每个工具独立命名空间，自动保存最近 20 条输入
import { useState, useCallback, useEffect } from 'react';

export const useToolHistory = (toolId, maxItems = 20) => {
  const storageKey = `tool_history_${toolId}`;

  const getHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const [history, setHistory] = useState(getHistory);

  useEffect(() => {
    setHistory(getHistory());
  }, [getHistory]);

  const addHistory = useCallback((input) => {
    if (!input || (typeof input === 'string' && !input.trim())) return;
    setHistory(prev => {
      const filtered = prev.filter(item => item !== input);
      const next = [input, ...filtered].slice(0, maxItems);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey, maxItems]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHistory([]);
  }, [storageKey]);

  return { history, addHistory, clearHistory };
};

export default useToolHistory;
