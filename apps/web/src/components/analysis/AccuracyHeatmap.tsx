'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HeatmapMetric {
  id: string;
  category: string;
  aiTask: string;
  accuracy: number;
  majorCause?: string;
  sampleCount: number;
}

interface HeatmapProps {
  data: HeatmapMetric[];
  title?: string;
  onFilterChange?: (dimension: string) => void;
  isLoading?: boolean;
}

const getAccuracyColor = (score: number) => {
  if (score >= 0.9) return 'bg-emerald-500';
  if (score >= 0.8) return 'bg-emerald-300';
  if (score >= 0.7) return 'bg-yellow-300';
  if (score >= 0.6) return 'bg-orange-300';
  return 'bg-red-400';
};

export function AccuracyHeatmap({ data, title = '정확도 히트맵', onFilterChange, isLoading }: HeatmapProps) {
  const [dimension, setDimension] = useState('INDUSTRY');

  // Pivot data for heatmap: Rows = Categories, Cols = AI Tasks
  const categories = Array.from(new Set(data.map((d) => d.category)));
  const aiTasks = Array.from(new Set(data.map((d) => d.aiTask)));

  const handleFilterChange = (val: string) => {
    setDimension(val);
    if (onFilterChange) onFilterChange(val);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>AI 분석 품질을 색상으로 시각화합니다.</CardDescription>
        </div>
        <div className="w-[180px]">
          <Select value={dimension} onValueChange={handleFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="차원 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INDUSTRY">산업별</SelectItem>
              <SelectItem value="FUNCTION">기능별</SelectItem>
              <SelectItem value="SOURCE">출처별</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-3">구분</th>
                  {aiTasks.map((task) => (
                    <th key={task} className="px-4 py-3 text-center">
                      {task}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{cat}</td>
                    {aiTasks.map((task) => {
                      const metric = data.find((d) => d.category === cat && d.aiTask === task);
                      return (
                        <td key={`${cat}-${task}`} className="p-2 text-center">
                          {metric ? (
                            <div className="relative group cursor-help">
                              <div
                                className={`w-full py-2 rounded text-white font-bold ${getAccuracyColor(
                                  metric.accuracy
                                )}`}
                              >
                                {(metric.accuracy * 100).toFixed(0)}%
                              </div>
                              {/* Tooltip */}
                              <div className="absolute z-10 hidden p-2 mt-1 text-xs text-white bg-gray-800 rounded shadow-lg group-hover:block w-48 text-left left-0">
                                <p className="font-semibold">정확도: {metric.accuracy}</p>
                                <p>표본수: {metric.sampleCount}</p>
                                {metric.majorCause && (
                                  <p className="mt-1 text-yellow-300">⚠️ 주원인: {metric.majorCause}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
