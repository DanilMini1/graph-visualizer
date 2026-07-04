'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GraphView, GraphViewRef } from '@/components/GraphView';
import { ControlPanel } from '@/components/ControlPanel';
import { PathFinder } from '@/components/PathFinder';
import { GraphifyGraph, ReactFlowNode, ReactFlowEdge } from '@/lib/types';
import { validateGraph, parseGraph } from '@/lib/graphParser';
import { getNodeById } from '@/lib/search';

export default function Home() {
  const [graph, setGraph] = useState<GraphifyGraph | null>(null);
  const [filteredNodes, setFilteredNodes] = useState<ReactFlowNode[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<ReactFlowEdge[]>([]);
  const [graphViewKey, setGraphViewKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'explore' | 'path'>('explore');
  const graphViewRef = useRef<GraphViewRef | null>(null);

  const loadSampleData = useCallback(() => {
    fetch('/graph/metallurgy-graph.json')
      .then((res) => res.json())
      .then((data) => {
        if (validateGraph(data)) {
          setGraph(data);
        } else {
          console.error('Invalid graph data');
          alert('Invalid graph data format');
        }
      })
      .catch((error) => {
        console.error('Error loading sample data:', error);
        alert('Error loading sample data');
      });
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (validateGraph(data)) {
          setGraph(data);
        } else {
          console.error('Invalid graph data');
          alert('Invalid graph data format');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFilterChange = useCallback((filters: {
    nodeTypes: string[];
    edgeTypes: string[];
    communities: number[];
  }) => {
    if (!graph) return;

    const { nodes, edges } = parseGraph(graph);

    let filtered = nodes;
    if (filters.nodeTypes.length > 0) {
      filtered = filtered.filter(node =>
        node.data.nodeType && filters.nodeTypes.includes(node.data.nodeType)
      );
    }
    if (filters.communities.length > 0) {
      filtered = filtered.filter(node =>
        node.data.community !== undefined &&
        filters.communities.includes(node.data.community)
      );
    }

    const filteredNodeIds = new Set(filtered.map(n => n.id));

    let filteredE = edges;
    if (filters.edgeTypes.length > 0) {
      filteredE = filteredE.filter(edge =>
        edge.data?.edgeType && filters.edgeTypes.includes(edge.data.edgeType)
      );
    }
    if (filters.communities.length > 0) {
      filteredE = filteredE.filter(edge =>
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
      );
    }

    setFilteredNodes(filtered);
    setFilteredEdges(filteredE);
    setGraphViewKey(prev => prev + 1);
  }, [graph]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (graphViewRef.current?.selectNode) {
      graphViewRef.current.selectNode(nodeId);
    }
  }, []);

  const handleFindPath = useCallback((startNodeId: string, endNodeId: string) => {
    if (graphViewRef.current?.findPath) {
      graphViewRef.current.findPath(startNodeId, endNodeId);
    }
  }, []);

  const handleResetPath = useCallback(() => {
    if (graphViewRef.current?.resetHighlight) {
      graphViewRef.current.resetHighlight();
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#07050f] text-gray-100 overflow-hidden font-sans">

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className="sidebar w-80 min-w-80 flex flex-col h-full relative" style={{ maxWidth: '320px' }}>
        {/* Right border glow line */}
        <div className="absolute right-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, rgba(124,58,237,0.25), #1a1538 50%, rgba(124,58,237,0.1))' }} />

        {/* ── Header ── */}
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 0 18px rgba(124,58,237,0.35)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="2.5" fill="currentColor" />
                  <circle cx="6" cy="17" r="2.5" fill="currentColor" />
                  <circle cx="18" cy="17" r="2.5" fill="currentColor" />
                  <line x1="12" y1="9.5" x2="7.5" y2="14.5" />
                  <line x1="12" y1="9.5" x2="16.5" y2="14.5" />
                  <line x1="8.5" y1="17" x2="15.5" y2="17" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-tight">GraphAnalyzer</h1>
                <p className="text-[8px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: '#b388ff', letterSpacing: '0.18em' }}>СТРУКТУРЫ &amp; СВЯЗИ</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md" style={{ color: '#706a96', border: '1px solid #2a2554', background: '#0e0c20' }}>v1.1.0</span>
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div className="px-5 pb-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#080614', border: '1px solid #1a1738' }}>
            <button
              onClick={() => setActiveTab('explore')}
              className="flex-1 text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
              style={activeTab === 'explore'
                ? { background: '#7c3aed', color: '#fff', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }
                : { color: '#6b6b8a', background: 'transparent' }
              }
            >
              Навигация
            </button>
            <button
              onClick={() => setActiveTab('path')}
              className="flex-1 text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
              style={activeTab === 'path'
                ? { background: '#7c3aed', color: '#fff', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }
                : { color: '#6b6b8a', background: 'transparent' }
              }
            >
              Маршруты
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'explore' ? (
            <ControlPanel
              graph={graph}
              onFilterChange={handleFilterChange}
              onNodeSelect={handleNodeSelect}
              onLoadSampleData={loadSampleData}
              onFileUpload={handleFileUpload}
            />
          ) : (
            <PathFinder
              graph={graph}
              onFindPath={handleFindPath}
              onReset={handleResetPath}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid #151230', background: '#08061a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', boxShadow: '0 0 10px rgba(124,58,237,0.3)' }}>N</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e0dff0', lineHeight: 1.2 }}>Norilsk Nickel AI</div>
              <div style={{ fontSize: 9, fontWeight: 500, color: '#5a5678', lineHeight: 1.2 }}>Deepmind Team</div>
            </div>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 500, color: '#5a5678' }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
            online
          </span>
        </div>
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <main className="flex-1 relative bg-[#07050f]">
        {graph ? (
          <GraphView
            key={graphViewKey}
            ref={graphViewRef}
            graph={
              filteredNodes.length > 0 || filteredEdges.length > 0
                ? {
                    ...graph,
                    nodes: filteredNodes.map(n => ({
                      id: n.id,
                      label: n.data.label,
                      type: n.data.nodeType,
                      community: n.data.community,
                      confidence: n.data.confidence,
                      degree_centrality: n.data.degree_centrality,
                      betweenness_centrality: n.data.betweenness_centrality,
                      source_file: n.data.source_file,
                      source_location: n.data.source_location,
                    })),
                    edges: filteredEdges.map(e => ({
                      source: e.source,
                      target: e.target,
                      type: e.data?.edgeType,
                      weight: e.data?.weight,
                      confidence: e.data?.confidence,
                    })),
                  }
                : graph
            }
            onNodeClick={handleNodeSelect}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(to bottom, #07050f, #0d0a20, #07050f)' }}>
            <div className="max-w-md text-center space-y-5">
              <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <svg className="w-9 h-9" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25m6 0a3 3 0 100-6 3 3 0 000 6zm-6 0a3 3 0 100-6 3 3 0 000 6zm0 0h6m-6 0H3m12 0h5.25M3 7.5h18M3 21h18" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Граф знаний не загружен</h2>
                <p className="text-xs mt-1 max-w-[280px] mx-auto" style={{ color: '#8a8aa0' }}>
                  Загрузите готовый <code>graph.json</code> файл из Graphify или включите тестовый пример.
                </p>
              </div>
              <button
                onClick={loadSampleData}
                className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-white rounded-xl transition-all cursor-pointer active:scale-95"
                style={{ background: '#7c3aed', boxShadow: '0 0 15px rgba(124,58,237,0.3)', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                Загрузить демонстрационный граф
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
