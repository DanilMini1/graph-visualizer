'use client';

import React, { useState, useEffect } from 'react';
import { GraphifyGraph } from '@/lib/types';
import { getNodeTypes, getEdgeTypes, getCommunityCount } from '@/lib/graphParser';
import { searchNodes, initializeSearch } from '@/lib/search';
import { semanticSearch, type SemanticSearchResult } from '@/lib/nlpEngine';

interface ControlPanelProps {
  graph: GraphifyGraph | null;
  onFilterChange?: (filters: { nodeTypes: string[]; edgeTypes: string[]; communities: number[] }) => void;
  onNodeSelect?: (nodeId: string) => void;
  onLoadSampleData?: () => void;
  onFileUpload?: (file: File) => void;
}

/* ── Section header ── */
function SectionHeader({ icon, title, open, onToggle }: { icon: React.ReactNode; title: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', outline: 'none', background: 'none', border: 'none', padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6fa0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

function MiniChevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5a5678" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: checked ? '2px solid #7c3aed' : '2px solid #2a2554', background: checked ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
      {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
    </div>
  );
}

/* Icons */
const IconList = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="7" x2="21" y2="7" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="17" x2="21" y2="17" /><path d="M4 7h.01M4 12h.01M4 17h.01" strokeWidth="3" /></svg>;
const IconSearch = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconAI = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4c0 1.1-.9 2-2 2h-4a2 2 0 01-2-2 4 4 0 014-4z"/><path d="M8 8v8a4 4 0 008 0V8"/><line x1="6" y1="12" x2="18" y2="12"/></svg>;
const IconFilter = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const IconSpec = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a37cf7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></svg>;

const TYPE_LABELS: Record<string, string> = { material: 'Материал', process: 'Процесс', equipment: 'Оборудование', property: 'Параметр', experiment: 'Эксперимент', publication: 'Публикация', expert: 'Эксперт', facility: 'Объект' };
const TYPE_COLORS: Record<string, string> = { material: '#10b981', process: '#3b82f6', equipment: '#f59e0b', property: '#8b5cf6', experiment: '#ec4899', publication: '#06b6d4', expert: '#f97316', facility: '#6366f1' };

/* ═══════════════ MAIN ═══════════════ */

export function ControlPanel({ graph, onFilterChange, onNodeSelect, onLoadSampleData, onFileUpload }: ControlPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([]);
  const [selectedEdgeTypes, setSelectedEdgeTypes] = useState<string[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<number[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; label: string; type?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [openSource, setOpenSource] = useState(true);
  const [openSearch, setOpenSearch] = useState(true);
  const [openSemantic, setOpenSemantic] = useState(true);
  const [openFilter, setOpenFilter] = useState(true);
  const [openSpec, setOpenSpec] = useState(true);
  const [openNodes, setOpenNodes] = useState(false);
  const [openEdges, setOpenEdges] = useState(false);
  const [openComms, setOpenComms] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [nodeTypeQuery, setNodeTypeQuery] = useState('');
  const [edgeTypeQuery, setEdgeTypeQuery] = useState('');

  // Semantic search state
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult | null>(null);
  const [showSemanticResults, setShowSemanticResults] = useState(false);

  const nodeTypes = graph ? getNodeTypes(graph) : [];
  const edgeTypes = graph ? getEdgeTypes(graph) : [];
  const communityCount = graph ? getCommunityCount(graph) : 0;
  const communities = Array.from({ length: communityCount }, (_, i) => i);

  useEffect(() => { if (graph) initializeSearch(graph); }, [graph]);
  useEffect(() => {
    const t = setTimeout(() => { onFilterChange?.({ nodeTypes: selectedNodeTypes, edgeTypes: selectedEdgeTypes, communities: selectedCommunities }); }, 150);
    return () => clearTimeout(t);
  }, [selectedNodeTypes, selectedEdgeTypes, selectedCommunities, onFilterChange]);

  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    if (v.trim() && graph) {
      setSearchSuggestions(graph.nodes.filter(n => n.label.toLowerCase().includes(v.toLowerCase()) || n.id.toLowerCase().includes(v.toLowerCase())).slice(0, 8).map(n => ({ id: n.id, label: n.label, type: n.type })));
      setShowSuggestions(true);
    } else { setSearchSuggestions([]); setShowSuggestions(false); }
  };
  const handleSearch = () => { if (searchQuery && graph) { const r = searchNodes(searchQuery); if (r.nodes.length > 0) onNodeSelect?.(r.nodes[0].id); } setShowSuggestions(false); };
  const selectSuggestion = (id: string) => { onNodeSelect?.(id); setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false); };

  // Semantic search
  const handleSemanticSearch = () => {
    if (!semanticQuery.trim() || !graph) return;
    const results = semanticSearch(semanticQuery, graph);
    setSemanticResults(results);
    setShowSemanticResults(true);
  };

  const toggleIn = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  const toggleNum = (arr: number[], val: number) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  const resetFilters = () => { setSelectedNodeTypes([]); setSelectedEdgeTypes([]); setSelectedCommunities([]); setShowOnlySelected(false); setNodeTypeQuery(''); setEdgeTypeQuery(''); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onFileUpload?.(f); };

  const nodeCount = (t: string) => graph ? graph.nodes.filter(n => n.type === t).length : 0;
  const edgeCount = (t: string) => graph ? graph.edges.filter(e => e.type === t).length : 0;
  const commNodeCount = (c: number) => graph ? graph.nodes.filter(n => n.community === c).length : 0;
  const commColors = ['#a855f7','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#06b6d4','#f97316'];
  const filteredNT = nodeTypes.filter(t => t.toLowerCase().includes(nodeTypeQuery.toLowerCase())).filter(t => !showOnlySelected || selectedNodeTypes.includes(t));
  const filteredET = edgeTypes.filter(t => t.toLowerCase().includes(edgeTypeQuery.toLowerCase())).filter(t => !showOnlySelected || selectedEdgeTypes.includes(t));
  const filteredComm = communities.filter(c => !showOnlySelected || selectedCommunities.includes(c));
  const hasFilters = selectedNodeTypes.length > 0 || selectedEdgeTypes.length > 0 || selectedCommunities.length > 0;

  const S = {
    section: { borderBottom: '1px solid #16132d', padding: '16px 20px' } as React.CSSProperties,
    input: { background: '#0d0b1e', border: '1px solid #1e1b3d', color: '#fff', fontSize: 11, borderRadius: 12, padding: '9px 12px', width: '100%', outline: 'none' } as React.CSSProperties,
    btnPrimary: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, padding: '10px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 14px rgba(124,58,237,0.2)' } as React.CSSProperties,
    btnSecondary: { background: '#110e24', color: '#9a96b8', border: '1px solid #211d40', borderRadius: 12, padding: '10px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } as React.CSSProperties,
    clearActive: { color: '#a37cf7', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: 0 } as React.CSSProperties,
    clearDim: { color: '#2a2554', fontSize: 10, fontWeight: 700, cursor: 'default', background: 'none', border: 'none', padding: 0 } as React.CSSProperties,
    catRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' } as React.CSSProperties,
    catLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#706a96', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0 },
    subPanel: { background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 12, padding: 10, marginTop: 6 } as React.CSSProperties,
    subHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid rgba(30,27,61,0.3)' } as React.CSSProperties,
    subSearch: { background: '#110e24', border: '1px solid #1e1b3d', color: '#ddd', fontSize: 10, borderRadius: 8, padding: '6px 10px', width: '100%', outline: 'none', marginBottom: 6 } as React.CSSProperties,
    filterItem: (sel: boolean) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', border: sel ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent', background: sel ? 'rgba(124,58,237,0.08)' : 'transparent' }) as React.CSSProperties,
    badge: { fontSize: 10, padding: '1px 6px', background: '#110e24', borderRadius: 4, fontFamily: 'monospace', color: '#5a5678', fontWeight: 700, border: '1px solid #1e1b3d' } as React.CSSProperties,
  };

  return (
    <div style={{ userSelect: 'none' }}>

      {/* ═══ 1. ИСТОЧНИК ГРАФА ═══ */}
      <div style={S.section}>
        <SectionHeader icon={IconList} title="Источник графа" open={openSource} onToggle={() => setOpenSource(!openSource)} />
        {openSource && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 11, color: '#706a96', marginBottom: 12 }}>Выберите файл или запустите демо</p>
            <button onClick={onLoadSampleData} style={S.btnPrimary}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              Загрузить демо-граф
            </button>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <input type="file" accept=".json" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
              <button style={S.btnSecondary}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                Загрузить JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. БЫСТРЫЙ ПЕРЕХОД ═══ */}
      <div style={S.section}>
        <SectionHeader icon={IconSearch} title="Быстрый переход" open={openSearch} onToggle={() => setOpenSearch(!openSearch)} />
        {openSearch && (
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4670" strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" value={searchQuery} onChange={e => handleSearchChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Поиск по названию или ID..." style={{ ...S.input, paddingLeft: 34 }} />
              {searchQuery && <button onClick={() => handleSearchChange('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#706a96', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>}
            </div>
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="custom-scrollbar" style={{ position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 6, background: '#110e24', border: '1px solid #2a2552', borderRadius: 12, maxHeight: 192, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {searchSuggestions.map(item => (
                  <div key={item.id} onClick={() => selectSuggestion(item.id)} style={{ padding: '10px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1738' }} onMouseEnter={e => (e.currentTarget.style.background = '#1c1842')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, color: '#e0dff0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                      <div style={{ fontSize: 9, color: '#4a4670', fontFamily: 'monospace' }}>{item.id}</div>
                    </div>
                    {item.type && <span style={{ fontSize: 9, padding: '2px 6px', background: TYPE_COLORS[item.type] || '#1e193b', color: '#fff', borderRadius: 4, flexShrink: 0 }}>{TYPE_LABELS[item.type] || item.type}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 3. УМНЫЙ ПОИСК (NLP) ═══ */}
      <div style={S.section}>
        <SectionHeader icon={IconAI} title="Умный поиск" open={openSemantic} onToggle={() => setOpenSemantic(!openSemantic)} />
        {openSemantic && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, color: '#706a96', marginBottom: 8 }}>Задайте вопрос на естественном языке</p>
            <textarea
              value={semanticQuery}
              onChange={e => setSemanticQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSemanticSearch(); } }}
              placeholder="Например: Какие методы обессоливания воды подходят для обогатительной фабрики?"
              rows={3}
              style={{ ...S.input, resize: 'vertical', minHeight: 60, lineHeight: 1.4 }}
            />
            <button onClick={handleSemanticSearch} disabled={!graph || !semanticQuery.trim()} style={{ ...S.btnPrimary, marginTop: 8, opacity: (!graph || !semanticQuery.trim()) ? 0.4 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Найти
            </button>

            {/* Results */}
            {showSemanticResults && semanticResults && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: '#706a96', marginBottom: 8 }}>
                  Найдено: <b style={{ color: '#e0dff0' }}>{semanticResults.totalFound}</b> результатов
                  {semanticResults.parsedQuery.geography !== 'all' && <span style={{ marginLeft: 6, color: '#a37cf7' }}>📍 {semanticResults.parsedQuery.geography === 'russia' ? 'Россия' : 'Зарубежные'}</span>}
                  {semanticResults.parsedQuery.yearRange.from && <span style={{ marginLeft: 6, color: '#06b6d4' }}>📅 с {semanticResults.parsedQuery.yearRange.from}</span>}
                </div>
                <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {semanticResults.results.slice(0, 15).map((r, i) => (
                    <div key={r.node.id} onClick={() => onNodeSelect?.(r.node.id)} style={{ padding: '10px 12px', marginBottom: 4, background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1b3d')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#e0dff0', marginBottom: 2 }}>{r.node.label}</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {r.node.type && <span style={{ fontSize: 8, padding: '1px 5px', background: TYPE_COLORS[r.node.type] || '#333', color: '#fff', borderRadius: 3 }}>{TYPE_LABELS[r.node.type] || r.node.type}</span>}
                            {r.node.confidence && <span style={{ fontSize: 8, padding: '1px 5px', background: '#1e1b3d', color: r.node.confidence >= 0.9 ? '#10b981' : '#f59e0b', borderRadius: 3 }}>{Math.round(r.node.confidence * 100)}%</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>+{r.score}</span>
                      </div>
                      {r.matchReasons.length > 0 && (
                        <div style={{ fontSize: 9, color: '#5a5678', marginTop: 4, lineHeight: 1.4 }}>{r.matchReasons.slice(0, 3).join(' · ')}</div>
                      )}
                      {r.relatedNodes.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {r.relatedNodes.slice(0, 3).map(rn => (
                            <span key={rn.node.id} style={{ fontSize: 8, padding: '1px 4px', background: '#110e24', border: '1px solid #1e1b3d', borderRadius: 3, color: '#706a96' }}>{rn.edgeType} → {rn.node.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {semanticResults.totalFound > 15 && <p style={{ fontSize: 10, color: '#5a5678', marginTop: 6, textAlign: 'center' }}>...ещё {semanticResults.totalFound - 15} результатов</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 4. ФИЛЬТРАЦИЯ ═══ */}
      <div style={S.section}>
        <SectionHeader icon={IconFilter} title="Фильтрация" open={openFilter} onToggle={() => setOpenFilter(!openFilter)} />
        {openFilter && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 12, padding: '9px 14px', marginBottom: 14 }}>
              <div onClick={() => setShowOnlySelected(!showOnlySelected)} style={{ width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer', background: showOnlySelected ? '#7c3aed' : '#2a2554', transition: 'background 0.2s', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.2s', transform: showOnlySelected ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
              <span style={{ fontSize: 11, color: '#c0bdd4', fontWeight: 500 }}>Только выбранные</span>
            </div>

            {/* Node types */}
            <div style={S.catRow}>
              <button onClick={() => setOpenNodes(!openNodes)} style={S.catLabel}> ТИПЫ УЗЛОВ ({selectedNodeTypes.length}) <MiniChevron open={openNodes} /></button>
              <button onClick={() => setSelectedNodeTypes([])} style={selectedNodeTypes.length > 0 ? S.clearActive : S.clearDim}>Снять</button>
            </div>
            {openNodes && (
              <div style={S.subPanel}>
                <div style={S.subHeader}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#4a4670', textTransform: 'uppercase' }}>Список типов узлов</span>
                  <button onClick={e => { e.stopPropagation(); setSelectedNodeTypes(selectedNodeTypes.length === nodeTypes.length ? [] : [...nodeTypes]); }} style={{ fontSize: 9, fontWeight: 700, color: '#a37cf7', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{selectedNodeTypes.length === nodeTypes.length ? 'Снять все' : 'Выбрать все'}</button>
                </div>
                {nodeTypes.length > 0 && <input type="text" value={nodeTypeQuery} onChange={e => setNodeTypeQuery(e.target.value)} placeholder="Поиск по типам..." style={S.subSearch} />}
                <div className="custom-scrollbar" style={{ maxHeight: 144, overflowY: 'auto' }}>
                  {filteredNT.length > 0 ? filteredNT.map(type => {
                    const sel = selectedNodeTypes.includes(type);
                    return (
                      <div key={type} onClick={() => setSelectedNodeTypes(toggleIn(selectedNodeTypes, type))} style={S.filterItem(sel)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <Check checked={sel} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: sel ? '#e0dff0' : '#706a96', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: TYPE_COLORS[type] || '#666', marginRight: 6, verticalAlign: 'middle' }}/>{TYPE_LABELS[type] || type}
                          </span>
                        </div>
                        <span style={S.badge}>{nodeCount(type)}</span>
                      </div>
                    );
                  }) : <div style={{ fontSize: 10, color: '#4a4670', textAlign: 'center', padding: 8 }}>Нет типов</div>}
                </div>
              </div>
            )}

            {/* Edge types */}
            <div style={{ ...S.catRow, marginTop: 4 }}>
              <button onClick={() => setOpenEdges(!openEdges)} style={S.catLabel}> ТИПЫ СВЯЗЕЙ ({selectedEdgeTypes.length}) <MiniChevron open={openEdges} /></button>
              <button onClick={() => setSelectedEdgeTypes([])} style={selectedEdgeTypes.length > 0 ? S.clearActive : S.clearDim}>Снять</button>
            </div>
            {openEdges && (
              <div style={S.subPanel}>
                <div style={S.subHeader}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#4a4670', textTransform: 'uppercase' }}>Список типов связей</span>
                  <button onClick={e => { e.stopPropagation(); setSelectedEdgeTypes(selectedEdgeTypes.length === edgeTypes.length ? [] : [...edgeTypes]); }} style={{ fontSize: 9, fontWeight: 700, color: '#a37cf7', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{selectedEdgeTypes.length === edgeTypes.length ? 'Снять все' : 'Выбрать все'}</button>
                </div>
                {edgeTypes.length > 0 && <input type="text" value={edgeTypeQuery} onChange={e => setEdgeTypeQuery(e.target.value)} placeholder="Поиск по связям..." style={S.subSearch} />}
                <div className="custom-scrollbar" style={{ maxHeight: 144, overflowY: 'auto' }}>
                  {filteredET.length > 0 ? filteredET.map(type => {
                    const sel = selectedEdgeTypes.includes(type);
                    return (
                      <div key={type} onClick={() => setSelectedEdgeTypes(toggleIn(selectedEdgeTypes, type))} style={S.filterItem(sel)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}><Check checked={sel} /><span style={{ fontSize: 11, fontWeight: 500, color: sel ? '#e0dff0' : '#706a96' }}>{type}</span></div>
                        <span style={S.badge}>{edgeCount(type)}</span>
                      </div>
                    );
                  }) : <div style={{ fontSize: 10, color: '#4a4670', textAlign: 'center', padding: 8 }}>Нет связей</div>}
                </div>
              </div>
            )}

            {/* Communities */}
            <div style={{ ...S.catRow, marginTop: 4 }}>
              <button onClick={() => setOpenComms(!openComms)} style={S.catLabel}> СООБЩЕСТВА ({selectedCommunities.length}) <MiniChevron open={openComms} /></button>
              <button onClick={() => setSelectedCommunities([])} style={selectedCommunities.length > 0 ? S.clearActive : S.clearDim}>Снять</button>
            </div>
            {openComms && (
              <div style={S.subPanel}>
                <div style={S.subHeader}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#4a4670', textTransform: 'uppercase' }}>Список сообществ</span>
                  <button onClick={e => { e.stopPropagation(); setSelectedCommunities(selectedCommunities.length === communities.length ? [] : [...communities]); }} style={{ fontSize: 9, fontWeight: 700, color: '#a37cf7', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{selectedCommunities.length === communities.length ? 'Снять все' : 'Выбрать все'}</button>
                </div>
                <div className="custom-scrollbar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, maxHeight: 144, overflowY: 'auto' }}>
                  {filteredComm.length > 0 ? filteredComm.map(c => {
                    const sel = selectedCommunities.includes(c);
                    return (
                      <div key={c} onClick={() => setSelectedCommunities(toggleNum(selectedCommunities, c))} style={S.filterItem(sel)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: commColors[c % commColors.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontWeight: 500, color: sel ? '#e0dff0' : '#706a96', whiteSpace: 'nowrap' }}>Груп. {c}</span>
                        </div>
                        <span style={{ fontSize: 9, color: '#5a5678', fontFamily: 'monospace' }}>{commNodeCount(c)}</span>
                      </div>
                    );
                  }) : <div style={{ fontSize: 10, color: '#4a4670', textAlign: 'center', padding: 8, gridColumn: 'span 2' }}>Нет сообществ</div>}
                </div>
              </div>
            )}

            <button onClick={resetFilters} disabled={!hasFilters} style={{ width: '100%', marginTop: 12, padding: '9px 0', fontSize: 11, fontWeight: 500, borderRadius: 12, border: '1px dashed ' + (hasFilters ? '#3d3570' : '#1a1738'), background: 'transparent', color: hasFilters ? '#9a96b8' : '#35305a', cursor: hasFilters ? 'pointer' : 'not-allowed' }}>Сбросить фильтры</button>
          </div>
        )}
      </div>

      {/* ═══ 5. СПЕЦИФИКАЦИЯ ═══ */}
      <div style={{ padding: '16px 20px' }}>
        <SectionHeader icon={IconSpec} title="Спецификация" open={openSpec} onToggle={() => setOpenSpec(!openSpec)} />
        {openSpec && (
          <div style={{ marginTop: 14 }}>
            {graph ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#706a96', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Узлы</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 2 }}>{graph.nodes.length}</div>
                </div>
                <div style={{ background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#706a96', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Связи</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 2 }}>{graph.edges.length}</div>
                </div>
                <div style={{ gridColumn: 'span 2', background: '#0d0b1e', border: '1px solid #1e1b3d', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: '#706a96', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Сообщества</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#a37cf7', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', padding: '2px 10px', borderRadius: 8 }}>{communityCount}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#4a4670' }}>Загрузите граф для просмотра</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
