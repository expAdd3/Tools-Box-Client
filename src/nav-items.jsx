import { HomeIcon, FileJson, FileText, Clock, Type, Code } from "lucide-react";

/**
* Central place for defining the navigation items. Used for navigation components.
*/
export const navItems = [
  {
    title: "JSON Diff",
    icon: <HomeIcon className="h-4 w-4" />,
  },
  {
    title: "JSON格式化",
    icon: <FileJson className="h-4 w-4" />,
  },
  {
    title: "文本差异比较",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "时间戳转换",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    title: "日期差值计算",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    title: "ASCII 码转换",
    icon: <Type className="h-4 w-4" />,
  },
  {
    title: "Unicode 解码",
    icon: <Code className="h-4 w-4" />,
  },
];
