'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
}

export function MermaidChart({ chart }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    if (containerRef.current) {
        mermaid.contentLoaded();
    }
  }, []);

  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.innerHTML = ''; // Clear previous render
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        mermaid.render(id, chart).then(({ svg }) => {
            if (containerRef.current) {
                containerRef.current.innerHTML = svg;
            }
        });
    }
  }, [chart]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
}
