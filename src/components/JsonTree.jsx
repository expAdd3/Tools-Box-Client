import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const INDENT_SIZE = 16;

const JsonTree = ({ data, allExpanded = true }) => {
  const [expandedMap, setExpandedMap] = useState({ root: allExpanded });

  useEffect(() => {
    setExpandedMap({ root: allExpanded });
  }, [data, allExpanded]);

  const toggleNode = (path) => {
    setExpandedMap((prev) => ({
      ...prev,
      [path]: !(prev[path] ?? true),
    }));
  };

  const isExpanded = (path) => expandedMap[path] ?? true;

  const formatPrimitive = (value) => {
    if (value === null) {
      return <span className="text-muted-foreground">null</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{String(value)}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-green-600 break-all">"{value}"</span>;
    }

    return <span>{String(value)}</span>;
  };

  const lines = useMemo(() => {
    const result = [];

    const walk = (value, depth, path, keyName, withComma = false) => {
      const keyPrefix = keyName !== undefined ? (
        <>
          <span className="text-red-600">"{keyName}"</span>
          <span className="text-foreground">: </span>
        </>
      ) : null;

      if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        result.push({
          id: path,
          depth,
          isExpandable: false,
          content: (
            <>
              {keyPrefix}
              {formatPrimitive(value)}
              {withComma && <span className="text-foreground">,</span>}
            </>
          ),
        });
        return;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          result.push({
            id: path,
            depth,
            isExpandable: false,
            content: (
              <>
                {keyPrefix}
                <span className="text-foreground">[]</span>
                {withComma && <span className="text-foreground">,</span>}
              </>
            ),
          });
          return;
        }

        const open = isExpanded(path);
        result.push({
          id: `${path}-open`,
          depth,
          isExpandable: true,
          open,
          content: (
            <>
              {keyPrefix}
              <span className="text-foreground">[</span>
              {!open && <span className="text-muted-foreground ml-1 text-xs">{value.length} 项...</span>}
              {!open && <span className="text-foreground">]</span>}
              {!open && withComma && <span className="text-foreground">,</span>}
            </>
          ),
        });

        if (open) {
          value.forEach((item, index) => {
            walk(item, depth + 1, `${path}[${index}]`, undefined, index < value.length - 1);
          });

          result.push({
            id: `${path}-close`,
            depth,
            isExpandable: false,
            content: (
              <>
                <span className="text-foreground">]</span>
                {withComma && <span className="text-foreground">,</span>}
              </>
            ),
          });
        }

        return;
      }

      const entries = Object.entries(value);
      if (entries.length === 0) {
        result.push({
          id: path,
          depth,
          isExpandable: false,
          content: (
            <>
              {keyPrefix}
              <span className="text-foreground">{'{}'}</span>
              {withComma && <span className="text-foreground">,</span>}
            </>
          ),
        });
        return;
      }

      const open = isExpanded(path);
      result.push({
        id: `${path}-open`,
        depth,
        isExpandable: true,
        open,
        content: (
          <>
            {keyPrefix}
            <span className="text-foreground">{'{'}</span>
            {!open && <span className="text-muted-foreground ml-1 text-xs">{entries.length} 个字段...</span>}
            {!open && <span className="text-foreground">{'}'}</span>}
            {!open && withComma && <span className="text-foreground">,</span>}
          </>
        ),
      });

      if (open) {
        entries.forEach(([key, childValue], index) => {
          walk(childValue, depth + 1, `${path}.${key}`, key, index < entries.length - 1);
        });

        result.push({
          id: `${path}-close`,
          depth,
          isExpandable: false,
          content: (
            <>
              <span className="text-foreground">{'}'}</span>
              {withComma && <span className="text-foreground">,</span>}
            </>
          ),
        });
      }
    };

    walk(data, 0, 'root');

    return result.map((item, index) => ({
      ...item,
      lineNumber: index + 1,
    }));
  }, [data, expandedMap]);

  return (
    <div className="font-mono text-sm">
      {lines.map((line) => {
        const togglePath = line.id.replace(/-open$/, '');

        return (
          <div
            key={line.id}
            className="grid grid-cols-[24px_52px_1fr] items-start min-h-6 hover:bg-accent/40"
          >
            <div className="flex justify-center pt-1 select-none">
              {line.isExpandable ? (
                <button
                  type="button"
                  onClick={() => toggleNode(togglePath)}
                  className="rounded-sm p-0.5 hover:bg-accent"
                >
                  {line.open ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              ) : null}
            </div>

            <div className="pr-3 pt-0.5 text-right text-xs text-muted-foreground select-none border-r border-border/60">
              {line.lineNumber}
            </div>

            <div
              className="whitespace-pre-wrap break-words px-3 py-0.5"
              style={{ paddingLeft: `${line.depth * INDENT_SIZE + 12}px` }}
            >
              {line.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JsonTree;
