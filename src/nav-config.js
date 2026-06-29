
import { 
  FileJson, 
  FileText, 
  Clock, 
  Type, 
  Code, 
  FileCode,
  Key,
  Link,
  Hash,
  FileType,
  Copy,
  Home,
  BookOpen
} from 'lucide-react';

export const navConfig = [
  {
    title: "JSON Diff",
    icon: FileJson,
    description: "比较两个 JSON 文件的差异"
  },
  {
    title: "JSON格式化",
    icon: FileJson,
    description: "格式化和美化 JSON 数据"
  },
  {
    title: "JSONL格式化",
    icon: FileJson,
    description: "将 JSONL 数据按行拆分并格式化展示"
  },
  {
    title: "文本差异比较",
    icon: FileText,
    description: "比较两段文本的差异"
  },
  {
    title: "时间戳转换",
    icon: Clock,
    description: "时间戳与日期时间相互转换"
  },
  {
    title: "日期差值计算",
    icon: Clock,
    description: "计算两个日期之间的差值"
  },
  {
    title: "ASCII 码转换",
    icon: Type,
    description: "字符与 ASCII 码相互转换"
  },
  {
    title: "Unicode 解码",
    icon: Code,
    description: "解码 Unicode 编码的文本"
  },
  {
    title: "Base64 转换",
    icon: FileCode,
    description: "Base64 编码和解码"
  },
  {
    title: "UUID 生成器",
    icon: Hash,
    description: "生成各种版本的 UUID"
  },
  {
    title: "文本去重",
    icon: Copy,
    description: "去除文本中的重复行"
  },
  {
    title: "JWT 解析",
    icon: Key,
    description: "解析和验证 JWT Token"
  },
  {
    title: "URL 编解码",
    icon: Link,
    description: "URL 编码和解码工具"
  },
  {
    title: "Markdown 展示器",
    icon: BookOpen,
    description: "Markdown 预览与代码高亮展示"
  },
  {
    title: "占位页面",
    icon: Home,
    description: "占位页面"
  }
];

export default navConfig;

