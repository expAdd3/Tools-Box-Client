import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const PlaceholderPage = () => {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            占位页面
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            此页面正在开发中，敬请期待...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
