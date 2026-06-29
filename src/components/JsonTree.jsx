import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const JsonTree = ({ data, level = 0, keyName = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const indent = level * 16;
  
  if (data === null) {
    return <span className="text-muted-foreground">null</span>;
  }
  
  if (typeof data === 'boolean') {
    return <span className="text-purple-600">{data.toString()}</span>;
  }
  
  if (typeof data === 'number') {
    return <span className="text-blue-600">{data}</span>;
  }
  
  if (typeof data === 'string') {
    return <pre className="inline m-0 p-0 text-green-600 whitespace-pre-wrap">"{data}"</pre>;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-foreground">[]</span>;
    }
    
    return (
      <div>
        <span 
          className="inline-flex items-center cursor-pointer hover:bg-muted rounded px-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 mr-1 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground" />
          )}
          <span className="text-foreground">[</span>
          {!isExpanded && <span className="text-muted-foreground text-xs ml-1">{data.length} 项...</span>}
          {!isExpanded && <span className="text-foreground">]</span>}
        </span>
        
        {isExpanded && (
          <div style={{ marginLeft: indent > 0 ? 16 : 0 }}>
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <JsonTree data={item} level={level + 1} />
                {index < data.length - 1 && <span className="text-foreground">,</span>}
              </div>
            ))}
            <span className="text-foreground">]</span>
          </div>
        )}
      </div>
    );
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="text-foreground">{'{}'}</span>;
    }
    
    return (
      <div>
        <span 
          className="inline-flex items-center cursor-pointer hover:bg-muted rounded px-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 mr-1 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground" />
          )}
          <span className="text-foreground">{'{'}</span>
          {!isExpanded && <span className="text-muted-foreground text-xs ml-1">{keys.length} 个字段...</span>}
          {!isExpanded && <span className="text-foreground">{'}'}</span>}
        </span>
        
        {isExpanded && (
          <div style={{ marginLeft: indent > 0 ? 16 : 0 }}>
            {keys.map((key, index) => (
              <div key={key} className="py-0.5">
                <span className="text-red-600">"{key}"</span>
                <span className="text-foreground mr-2">:</span>
                <JsonTree data={data[key]} level={level + 1} keyName={key} />
                {index < keys.length - 1 && <span className="text-foreground">,</span>}
              </div>
            ))}
            <span className="text-foreground">{'}'}</span>
          </div>
        )}
      </div>
    );
  }
  
  return <span>{String(data)}</span>;
};

export default JsonTree;
