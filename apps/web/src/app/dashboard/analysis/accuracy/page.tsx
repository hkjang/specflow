'use client';

import React, { useEffect, useState } from 'react';
import { AccuracyHeatmap } from '@/components/analysis/AccuracyHeatmap';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, CheckCircle, Database } from 'lucide-react';
import { MermaidChart } from '@/components/ui/mermaid-chart';

const improvementCycleChart = `
flowchart LR
    A[요건 처리 결과]:::data
    B[정확도 측정]:::metric
    C[히트맵 시각화]:::heat
    D[저정확 영역 식별]:::detect
    E[개선 작업]:::improve
    F[모델·규칙 반영]:::model
    G[재측정]:::loop

    A --> B --> C --> D
    D --> E --> F --> G
    G --> B

    classDef data fill:#e3f2fd,stroke:#1565c0
    classDef metric fill:#fffde7,stroke:#f9a825
    classDef heat fill:#fce4ec,stroke:#ad1457
    classDef detect fill:#e8f5e9,stroke:#2e7d32
    classDef improve fill:#ede7f6,stroke:#512da8
    classDef model fill:#fff3e0,stroke:#ef6c00
    classDef loop fill:#f3e5f5,stroke:#6a1b9a
`;

export default function AccuracyDashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dimension, setDimension] = useState('INDUSTRY');
  const [reportData, setReportData] = useState<any>(null);
  const [showTermModal, setShowTermModal] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<any>(null);
  const [termData, setTermData] = useState({ term: '', definition: '' });

  const [prediction, setPrediction] = useState<any>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const fetchPrediction = async (cat: string) => {
    try {
        const res = await fetch(`http://localhost:3001/analysis/accuracy/forecast?category=${cat}`);
        const json = await res.json();
        setPrediction(json);
    } catch (e) {
        console.error(e);
    }
  };

  const fetchData = async (dim: string) => {
    setLoading(true);
    try {
      let url = `http://localhost:3001/analysis/accuracy/heatmap?dimension=${dim}`;
      if (selectedOrg) url += `&organizationId=${selectedOrg}`;
      if (selectedModel) url += `&aiModel=${selectedModel}`;

      const [heatmapRes, impRes] = await Promise.all([
        fetch(url),
        fetch(`http://localhost:3001/analysis/accuracy/improvements`)
      ]);
      
      const heatmapJson = await heatmapRes.json();
      const impJson = await impRes.json();
      
      setData(heatmapJson);
      setImprovements(impJson);
      
      // Auto-fetch prediction for the first category if available
      if (heatmapJson.length > 0) {
          fetchPrediction(heatmapJson[0].category);
      }
    } catch (e) {
      console.error('Failed to fetch accuracy data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await fetch(`http://localhost:3001/analysis/accuracy/seed`, { method: 'POST' });
      fetchData(dimension);
      alert('시드 데이터가 생성되었습니다.');
    } catch (e) {
      alert('시드 데이터 생성 실패');
    }
  };

  const handleAction = (imp: any) => {
    if (imp.majorCause && imp.majorCause.includes('Term') || imp.suggestedAction.includes('Dictionary')) {
        setSelectedImprovement(imp);
        setTermData({ term: '', definition: '' });
        setShowTermModal(true);
    } else {
        alert('이 항목은 현재 자동화된 조치를 지원하지 않습니다. 수동 검토가 필요합니다.');
    }
  };

  const submitTerm = async () => {
    try {
        await fetch(`http://localhost:3001/analysis/accuracy/terms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                term: termData.term,
                definition: termData.definition,
                industry: selectedImprovement?.category
            })
        });
        alert('용어가 성공적으로 등록되었습니다.');
        setShowTermModal(false);
    } catch (e) {
        alert('용어 등록 실패');
    }
  };

  const generateReport = async () => {
      try {
          const res = await fetch(`http://localhost:3001/analysis/accuracy/report`, { method: 'POST' });
          const json = await res.json();
          setReportData(json);
          alert(`보고서 생성 완료: ${json.title}\n종합 정확도: ${(json.summary.overallAccuracy * 100).toFixed(1)}%`);
      } catch (e) {
          alert('리포트 생성 실패');
      }
  };

  useEffect(() => {
    fetchData(dimension);
  }, [dimension, selectedOrg, selectedModel]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">전략적 요건 품질 플랫폼 (Strategic Platform)</h1>
          <p className="text-muted-foreground">AI 기반 요건의 정확도, 리스크, 그리고 미래 품질을 예측·관리합니다.</p>
        </div>
        <div className="flex gap-2">
            <select className="border rounded p-2 text-sm" onChange={(e) => setSelectedOrg(e.target.value)}>
                <option value="">전체 조직 (All Organizations)</option>
                <option value="woori_bank">우리은행</option>
                <option value="samsung_life">삼성생명</option>
            </select>
            <select className="border rounded p-2 text-sm" onChange={(e) => setSelectedModel(e.target.value)}>
                <option value="">모든 AI 모델</option>
                <option value="GPT-4">GPT-4</option>
                <option value="Claude-3">Claude 3.5 Sonnet</option>
                <option value="Solar">Solar LLM</option>
            </select>
            <Button variant="outline" onClick={handleSeed}>
                <Database className="mr-2 h-4 w-4" /> 시드 데이터
            </Button>
            <Button variant="default" onClick={generateReport}>
                <TrendingUp className="mr-2 h-4 w-4" /> 리포트 생성
            </Button>
        </div>
      </div>

      {/* Prediction Insight Panel */}
      {prediction && (
          <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      AI 품질 예측 (Quality Forecast): {prediction.category}
                  </CardTitle>
                  <CardDescription>과거 트렌드를 기반으로 다음 분기 정확도를 예측합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex items-center justify-around text-center">
                      <div>
                          <p className="text-sm text-gray-500">현재 정확도</p>
                          <p className="text-2xl font-bold">{(prediction.current * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-3xl text-gray-300">→</div>
                      <div>
                          <p className="text-sm text-gray-500">예측 정확도 (Next Period)</p>
                          <p className={`text-2xl font-bold ${prediction.trend === 'DOWN' ? 'text-red-600' : 'text-green-600'}`}>
                              {(prediction.predicted * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                              신뢰구간: {(prediction.confidence.low * 100).toFixed(1)}% ~ {(prediction.confidence.high * 100).toFixed(1)}%
                          </p>
                      </div>
                      <div>
                          <p className="text-sm text-gray-500">예상 트렌드</p>
                          <span className={`px-2 py-1 rounded text-sm font-bold ${prediction.trend === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {prediction.trend === 'DOWN' ? '📉 하락세 (Risk)' : '📈 상승세 (Stable)'}
                          </span>
                      </div>
                  </div>
              </CardContent>
          </Card>
      )}

      {/* ... (Existing Cards and Heatmap) ... */}

      {/* Report Summary Card (Conditional) */}
      {reportData && (
        <Card className="bg-slate-50 border-blue-200">
            <CardHeader>
                <CardTitle>📊 {reportData.title}</CardTitle>
                <CardDescription>Generated at: {new Date(reportData.generatedAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-500">종합 정확도</p>
                        <p className="text-xl font-bold text-blue-600">{(reportData.summary.overallAccuracy * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">분석된 메트릭</p>
                        <p className="text-xl font-bold">{reportData.summary.totalMetrics} 개</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">긴급 개선 항목</p>
                        <p className="text-xl font-bold text-red-600">{reportData.summary.criticalIssues} 개</p>
                    </div>
                </div>
                <div className="mt-4 p-4 bg-white rounded border">
                    <p className="font-semibold">💡 AI Recommendation:</p>
                    <p className="text-sm text-gray-700">{reportData.recommendation}</p>
                </div>
            </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 평균 정확도</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85.4%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">취약 영역</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">메신저/약어</div>
            <p className="text-xs text-muted-foreground">정확도 65% (최저)</p>
          </CardContent>
        </Card>
      </div>

      <AccuracyHeatmap
        data={data}
        isLoading={loading}
        onFilterChange={(val) => setDimension(val)}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>개선 우선순위 (Improvement Priority)</CardTitle>
                <CardDescription>
                    영향도(Impact)와 리스크(Risk)를 고려하여 자동으로 도출된 개선 항목입니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {improvements.map((imp) => (
                        <li key={imp.id} className="flex items-start justify-between border-b pb-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                        imp.priorityLevel === 'HIGH' ? 'bg-red-100 text-red-600' :
                                        imp.priorityLevel === 'MEDIUM' ? 'bg-orange-100 text-orange-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        [{imp.priorityLevel}]
                                    </span>
                                    <p className="font-semibold">{imp.dimension} - {imp.category}</p>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    정확도: {imp.accuracy} | 영향도: {imp.impact} | 리스크: {imp.risk}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    💡 제안: {imp.suggestedAction} (원인: {imp.majorCause})
                                </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleAction(imp)}>
                                {imp.suggestedAction.includes('Term') ? '용어 등록' : '조치하기'}
                            </Button>
                        </li>
                    ))}
                    {improvements.length === 0 && (
                        <p className="text-sm text-gray-400">개선할 항목이 없습니다.</p>
                    )}
                </ul>
            </CardContent>
        </Card>

        {/* ... Mermaid Chart ... */}
        
        {/* Terminology Modal (Simple Inline Implementation for Demo) */}
        {showTermModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-[400px] bg-white">
                    <CardHeader>
                        <CardTitle>전문 용어 등록 (Terminology)</CardTitle>
                        <CardDescription>
                            '{selectedImprovement?.category}' 분야의 정확도 향상을 위해 용어 사전에 단어를 추가합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">용어명 (Term)</label>
                            <input 
                                className="w-full border p-2 rounded" 
                                value={termData.term}
                                onChange={(e) => setTermData({...termData, term: e.target.value})}
                                placeholder="예: DTI (총부채상환비율)"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">정의 (Definition)</label>
                            <textarea 
                                className="w-full border p-2 rounded" 
                                value={termData.definition}
                                onChange={(e) => setTermData({...termData, definition: e.target.value})}
                                placeholder="용어에 대한 설명을 입력하세요."
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowTermModal(false)}>취소</Button>
                            <Button onClick={submitTerm}>등록하기</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Placeholder for Mermaid Diagram */}
        <Card>
            <CardHeader>
                <CardTitle>지속적 개선 사이클 (Improvement Cycle)</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center bg-white p-4">
                <MermaidChart chart={improvementCycleChart} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
