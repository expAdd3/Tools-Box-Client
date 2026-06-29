import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { differenceInDays, differenceInBusinessDays, format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';

const DateDifferencePage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // 内置节假日数据（优先使用，API 作为补充）
  const builtInHolidays = {
    2024: [
      '2024-01-01',
      '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17',
      '2024-04-04', '2024-04-05', '2024-04-06',
      '2024-05-01', '2024-05-02', '2024-05-03',
      '2024-06-08', '2024-06-09', '2024-06-10',
      '2024-09-15', '2024-09-16', '2024-09-17',
      '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07',
    ],
    2025: [
      '2025-01-01',
      '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04',
      '2025-04-05', '2025-04-06', '2025-04-07',
      '2025-05-01', '2025-05-02', '2025-05-03',
      '2025-05-31', '2025-06-01', '2025-06-02',
      '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07',
    ]
  };

  const getBuiltInHolidays = (year) => builtInHolidays[year] || [];

  const extractHolidayDates = (data) => {
    if (!data?.holiday) return [];
    const holidayDates = [];

    Object.values(data.holiday).forEach((monthData) => {
      Object.values(monthData).forEach((dayData) => {
        if (Number(dayData.status) === 1 && dayData.date) {
          holidayDates.push(dayData.date);
        }
      });
    });

    return holidayDates;
  };

  const fetchHolidaysForYear = async (year) => {
    const localDates = getBuiltInHolidays(year);

    try {
      const response = await fetch(`https://timor.tech/api/holiday/year/${year}`);
      const data = await response.json();
      const apiDates = extractHolidayDates(data);

      if (apiDates.length === 0) {
        return localDates;
      }

      return Array.from(new Set([...localDates, ...apiDates]));
    } catch (err) {
      console.error(`获取 ${year} 节假日数据失败:`, err);
      return localDates;
    }
  };

  const fetchHolidaysForRange = async (startYear, endYear) => {
    setIsLoadingHolidays(true);

    try {
      const years = [];
      for (let year = startYear; year <= endYear; year += 1) {
        years.push(year);
      }

      const allHolidays = await Promise.all(years.map((year) => fetchHolidaysForYear(year)));
      const merged = Array.from(new Set(allHolidays.flat()));
      setHolidays(merged);

      if (merged.length === 0) {
        toast.error('未获取到节假日数据，将只按周末计算工作日');
      }

      return merged;
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  // 日期变化时预加载日期范围内节假日
  useEffect(() => {
    if (!startDate || !endDate) return;

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return;

    fetchHolidaysForRange(start.getFullYear(), end.getFullYear());
  }, [startDate, endDate]);

  const calculateDifference = async () => {
    setError('');
    setResult(null);

    if (!startDate || !endDate) {
      setError('请选择开始日期和结束日期');
      return;
    }

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      if (start > end) {
        setError('开始日期不能晚于结束日期');
        return;
      }

      // 确保日期范围内节假日数据已加载
      let currentHolidays = holidays;
      if (currentHolidays.length === 0) {
        currentHolidays = await fetchHolidaysForRange(start.getFullYear(), end.getFullYear());
      }

      // 计算总天数
      const totalDays = differenceInDays(end, start) + 1; // 包含开始和结束日期

      // 计算工作日（排除周末）
      const businessDays = differenceInBusinessDays(end, start) + 1; // 包含开始和结束日期

      // 计算休息日（周末）
      const weekendDays = totalDays - businessDays;

      // 计算法定节假日
      const holidaysInRange = currentHolidays.filter(holiday => {
        const holidayDate = parseISO(holiday);
        return holidayDate >= start && holidayDate <= end;
      }).length;

      // 计算实际工作日（排除法定节假日）
      const actualBusinessDays = Math.max(0, businessDays - holidaysInRange);

      setResult({
        totalDays,
        businessDays,
        weekendDays,
        holidays: holidaysInRange,
        actualBusinessDays
      });
    } catch (err) {
      setError('日期格式错误，请选择有效的日期');
    }
  };

  const clearAll = () => {
    setStartDate('');
    setEndDate('');
    setResult(null);
    setError('');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">日期差值计算工具</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择日期范围</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start-date">开始日期</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">结束日期</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button 
              onClick={calculateDifference}
              disabled={isLoadingHolidays}
            >
              {isLoadingHolidays ? '加载节假日数据中...' : '计算差值'}
            </Button>
            <Button variant="outline" onClick={clearAll}>清空</Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>计算结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">总天数</h3>
                <p className="text-3xl font-bold text-blue-600">{result.totalDays}</p>
                <p className="text-sm text-muted-foreground mt-1">包含开始和结束日期</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">工作日</h3>
                <p className="text-3xl font-bold text-green-600">{result.businessDays}</p>
                <p className="text-sm text-muted-foreground mt-1">周一至周五</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">休息日</h3>
                <p className="text-3xl font-bold text-purple-600">{result.weekendDays}</p>
                <p className="text-sm text-muted-foreground mt-1">周六和周日</p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">法定节假日</h3>
                <p className="text-3xl font-bold text-yellow-600">{result.holidays}</p>
                <p className="text-sm text-muted-foreground mt-1">中国法定节假日</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">实际工作日</h3>
                <p className="text-3xl font-bold text-red-600">{result.actualBusinessDays}</p>
                <p className="text-sm text-muted-foreground mt-1">排除法定节假日</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">说明</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>总天数包含开始日期和结束日期</li>
                <li>工作日指周一至周五</li>
                <li>休息日指周六和周日</li>
                <li>法定节假日优先使用内置数据，并尝试通过节假日API补充更新</li>
                <li>实际工作日 = 工作日 - 法定节假日</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">推荐使用更专业的在线工作日计算器</h3>
              <p className="text-sm text-blue-700 mb-2">
                如果当前工具无法获取法定节假日，建议使用以下外部工具，它提供更准确的中国法定节假日和调休数据：
              </p>
              <a 
                href="https://www.iamwawa.cn/workingday.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 hover:underline text-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                蛙蛙工具 - 工作日计算器
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DateDifferencePage;
