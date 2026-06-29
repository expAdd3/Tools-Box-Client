import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home, ChevronDown, ChevronUp } from 'lucide-react';

// Color palette for different tags
const TAG_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
];

const JsonFieldNavigator = ({ json, currentPath = [], onPathChange, onScrollToField }) => {
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE_FIELDS = 5; // 最多显示5个字段

  const getCurrentObject = () => {
    let currentObj = json;
    for (const key of currentPath) {
      if (currentObj && typeof currentObj === 'object') {
        currentObj = currentObj[key];
      } else {
        return null;
      }
    }
    return currentObj;
  };

  const currentObj = getCurrentObject();
  
  const handleFieldClick = (field) => {
    const newPath = [...currentPath, field];
    onPathChange(newPath);
    
    // 触发滚动到字段位置
    if (onScrollToField) {
      onScrollToField(newPath);
    }
  };

  const handleBreadcrumbClick = (index) => {
    const newPath = currentPath.slice(0, index + 1);
    onPathChange(newPath);
    
    // 触发滚动到字段位置
    if (onScrollToField) {
      onScrollToField(newPath);
    }
  };

  const handleGoToRoot = () => {
    onPathChange([]);
    
    // 触发滚动到顶部
    if (onScrollToField) {
      onScrollToField([]);
    }
  };

  // 获取当前对象的所有字段
  const fields = currentObj && typeof currentObj === 'object' 
    ? Object.keys(currentObj) 
    : [];
  
  // 计算需要显示的字段数量
  const visibleFields = expanded ? fields : fields.slice(0, MAX_VISIBLE_FIELDS);
  const hasHiddenFields = fields.length > MAX_VISIBLE_FIELDS;

  return (
    <div className="mb-2">
      {/* Breadcrumb navigation with colors */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleGoToRoot}
          className="px-2 py-1 text-xs flex items-center"
        >
          <Home className="h-3 w-3 mr-1" />
        </Button>
        {currentPath.map((path, index) => {
          const colorIndex = index % TAG_COLORS.length;
          return (
            <React.Fragment key={index}>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className={`px-2 py-1 text-xs ${TAG_COLORS[colorIndex]}`}
              >
                {path}
              </Button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Field list with colored tags */}
      <div className="flex flex-wrap gap-1">
        {fields.length > 0 ? (
          <>
            {visibleFields.map((key, index) => {
              const colorIndex = (currentPath.length + index) % TAG_COLORS.length;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldClick(key)}
                  className={`text-xs px-2 py-1 ${TAG_COLORS[colorIndex]}`}
                >
                  {key}
                </Button>
              );
            })}
            
            {/* 展开/收起按钮 */}
            {hasHiddenFields && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs px-2 py-1 flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    展开全部 ({fields.length - MAX_VISIBLE_FIELDS})
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground px-2 py-1">
            当前字段没有子字段
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonFieldNavigator;
