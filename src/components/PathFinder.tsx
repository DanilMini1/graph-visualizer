'use client';

import React, { useState, useEffect } from 'react';
import { GraphifyGraph } from '@/lib/types';
import { getNodeById } from '@/lib/search';

interface PathFinderProps {
  graph: GraphifyGraph | null;
  onFindPath: (startNodeId: string, endNodeId: string) => void;
  onReset: () => void;
}

export function PathFinder({ graph, onFindPath, onReset }: PathFinderProps) {
  const [startNode, setStartNode] = useState('');
  const [endNode, setEndNode] = useState('');
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const startJustSelected = React.useRef(false);
  const endJustSelected = React.useRef(false);

  const allNodes = graph?.nodes || [];

  useEffect(() => {
    if (startJustSelected.current) { startJustSelected.current = false; return; }
    if (startNode.length > 0) {
      setStartSuggestions(
        allNodes
          .filter(n => n.label.toLowerCase().includes(startNode.toLowerCase()) || n.id.toLowerCase().includes(startNode.toLowerCase()))
          .slice(0, 8)
          .map(n => n.id)
      );
      setShowStartSuggestions(true);
    } else {
      setStartSuggestions([]);
      setShowStartSuggestions(false);
    }
  }, [startNode, allNodes]);

  useEffect(() => {
    if (endJustSelected.current) { endJustSelected.current = false; return; }
    if (endNode.length > 0) {
      setEndSuggestions(
        allNodes
          .filter(n => n.label.toLowerCase().includes(endNode.toLowerCase()) || n.id.toLowerCase().includes(endNode.toLowerCase()))
          .slice(0, 8)
          .map(n => n.id)
      );
      setShowEndSuggestions(true);
    } else {
      setEndSuggestions([]);
      setShowEndSuggestions(false);
    }
  }, [endNode, allNodes]);

  const handleFindPath = () => {
    if (startNode && endNode) {
      const startId = allNodes.find(n => n.label === startNode || n.id === startNode)?.id || startNode;
      const endId = allNodes.find(n => n.label === endNode || n.id === endNode)?.id || endNode;
      onFindPath(startId, endId);
    }
  };

  const handleReset = () => {
    setStartNode('');
    setEndNode('');
    onReset();
  };

  const selectStartNode = (nodeId: string) => {
    const node = getNodeById(nodeId);
    startJustSelected.current = true;
    setStartNode(node?.label || nodeId);
    setShowStartSuggestions(false);
    setStartSuggestions([]);
  };

  const selectEndNode = (nodeId: string) => {
    const node = getNodeById(nodeId);
    endJustSelected.current = true;
    setEndNode(node?.label || nodeId);
    setShowEndSuggestions(false);
    setEndSuggestions([]);
  };

  /* ── styles ── */
  const inputStyle: React.CSSProperties = {
    background: '#0d0b1e', border: '1px solid #1e1b3d', color: '#fff',
    fontSize: 11, borderRadius: 12, padding: '9px 12px', width: '100%', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#706a96', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 4, display: 'block',
  };
  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 4,
    background: '#110e24', border: '1px solid #2a2552', borderRadius: 12,
    maxHeight: 180, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  };
  const dropdownItemStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 11, cursor: 'pointer',
    borderBottom: '1px solid #1a1738', transition: 'background 0.15s',
  };

  if (!graph) {
    return (
      <div style={{ padding: '20px', userSelect: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center', background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 12 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p style={{ fontSize: 11, color: '#706a96', marginTop: 12, lineHeight: 1.5 }}>
            Загрузите граф во вкладке «Навигация» для построения маршрутов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', userSelect: 'none' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Наикратчайший маршрут
        </span>
      </div>

      {/* Start node */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <label style={labelStyle}>Начало (Узел A)</label>
        <input
          type="text"
          value={startNode}
          onChange={e => setStartNode(e.target.value)}
          onFocus={() => { if (!startJustSelected.current && startNode.length > 0) setShowStartSuggestions(true); }}
          placeholder="Введите название или ID..."
          style={inputStyle}
        />
        {showStartSuggestions && startSuggestions.length > 0 && (
          <div className="custom-scrollbar" style={dropdownStyle}>
            {startSuggestions.map(nodeId => {
              const node = getNodeById(nodeId);
              return (
                <div
                  key={nodeId}
                  onClick={() => selectStartNode(nodeId)}
                  style={dropdownItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1c1842')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 600, color: '#e0dff0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node?.label || nodeId}</div>
                  <div style={{ fontSize: 9, color: '#4a4670', fontFamily: 'monospace' }}>{nodeId}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* End node */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <label style={labelStyle}>Назначение (Узел B)</label>
        <input
          type="text"
          value={endNode}
          onChange={e => setEndNode(e.target.value)}
          onFocus={() => { if (!endJustSelected.current && endNode.length > 0) setShowEndSuggestions(true); }}
          placeholder="Введите название или ID..."
          style={inputStyle}
        />
        {showEndSuggestions && endSuggestions.length > 0 && (
          <div className="custom-scrollbar" style={dropdownStyle}>
            {endSuggestions.map(nodeId => {
              const node = getNodeById(nodeId);
              return (
                <div
                  key={nodeId}
                  onClick={() => selectEndNode(nodeId)}
                  style={dropdownItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1c1842')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 600, color: '#e0dff0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node?.label || nodeId}</div>
                  <div style={{ fontSize: 9, color: '#4a4670', fontFamily: 'monospace' }}>{nodeId}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleFindPath}
          disabled={!startNode || !endNode}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 12px', fontSize: 11, fontWeight: 600, borderRadius: 12, cursor: startNode && endNode ? 'pointer' : 'not-allowed',
            background: startNode && endNode ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#110e24',
            color: startNode && endNode ? '#fff' : '#35305a',
            border: startNode && endNode ? '1px solid rgba(139,92,246,0.3)' : '1px solid #1e1b3d',
            boxShadow: startNode && endNode ? '0 2px 12px rgba(124,58,237,0.2)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          Найти маршрут
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 14px', fontSize: 11, fontWeight: 600, borderRadius: 12,
            background: '#110e24', color: '#706a96', border: '1px solid #1e1b3d',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          Сброс
        </button>
      </div>
    </div>
  );
}
