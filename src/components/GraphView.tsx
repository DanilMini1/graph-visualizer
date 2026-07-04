'use client';

import React, { useCallback, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { applyForceLayout } from '@/lib/graphLayout';
import { ReactFlowNode, ReactFlowEdge, GraphifyGraph, PathResult } from '@/lib/types';
import { findShortestPath } from '@/lib/pathfinding';

const nodeTypes = {
  custom: CustomNode,
};

export interface GraphViewRef {
  findPath: (startNodeId: string, endNodeId: string) => void;
  resetHighlight: () => void;
  selectNode: (nodeId: string) => void;
}

interface GraphViewProps {
  graph: GraphifyGraph | null;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const GraphViewInner = forwardRef<GraphViewRef, GraphViewProps>(
  ({ graph, onNodeClick, width = 1200, height = 800 }, ref) => {
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<ReactFlowEdge>([]);
    const [pathResult, setPathResult] = useState<PathResult | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    const zoomToNode = useCallback(
      (nodeId: string) => {
        setTimeout(() => {
          fitView({
            nodes: [{ id: nodeId }],
            duration: 1000,
            minZoom: 1.2,
            maxZoom: 1.5,
          });
        }, 50);
      },
      [fitView]
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      findPath: (startNodeId: string, endNodeId: string) => {
        internalFindPath(startNodeId, endNodeId);
      },
      resetHighlight: () => {
        internalResetHighlight();
      },
      selectNode: (nodeId: string) => {
        setSelectedNode(nodeId);
        highlightNode(nodeId);
        zoomToNode(nodeId);
      },
    }));

    // Инициализация графа
    useEffect(() => {
      if (!graph) return;

      // Создаем ноды
      const initialNodes: ReactFlowNode[] = graph.nodes.map((node) => ({
        id: node.id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: node.label || node.id,
          nodeType: node.type || 'default',
          community: node.community,
          confidence: node.confidence,
          degree_centrality: node.degree_centrality,
          betweenness_centrality: node.betweenness_centrality,
          source_file: node.source_file,
          source_location: node.source_location,
          isHighlighted: false,
          isOnPath: false,
          isDimmed: false,
        },
      }));

      // Создаем ребра
      const initialEdges: ReactFlowEdge[] = graph.edges.map((edge, index) => ({
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: {
          strokeWidth: 1.5,
          stroke: '#6366f1',
        },
        data: {
          edgeType: edge.type || 'default',
          weight: edge.weight || 1,
          confidence: edge.confidence,
          isOnPath: false,
          isDimmed: false,
        },
      }));

      // Применяем layout
      const layoutedNodes = applyForceLayout(initialNodes, initialEdges, { width, height });

      setNodes(layoutedNodes);
      setEdges(initialEdges);
    }, [graph, width, height, setNodes, setEdges]);

    // Обработка новых соединений
    const onConnect = useCallback(
      (params: Connection) => setEdges((eds) => addEdge(params, eds)),
      [setEdges]
    );

    // Обработка клика по ноде
    const onNodeClickHandler = useCallback(
      (_event: React.MouseEvent, node: Node<ReactFlowNode['data']>) => {
        setSelectedNode(node.id);
        onNodeClick?.(node.id);
      },
      [onNodeClick]
    );

    // Подсветка ноды
    const highlightNode = useCallback(
      (nodeId: string) => {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              isHighlighted: node.id === nodeId,
              isDimmed: node.id !== nodeId,
            },
          }))
        );
      },
      [setNodes]
    );

    // Сброс подсветки
    const internalResetHighlight = useCallback(() => {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isHighlighted: false,
            isDimmed: false,
          },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
            isOnPath: false,
            isDimmed: false,
          },
        }))
      );
      setPathResult(null);
    }, [setNodes, setEdges]);

    // Обработка клика по свободному пространству холста
    const onPaneClickHandler = useCallback(
      (_event: React.MouseEvent) => {
        setSelectedNode(null);
        internalResetHighlight();
      },
      [internalResetHighlight]
    );

    // Поиск кратчайшего пути
    const internalFindPath = useCallback(
      (startNodeId: string, endNodeId: string) => {
        if (!graph) return;

        const result = findShortestPath(graph, startNodeId, endNodeId);
        setPathResult(result);

        if (result.exists) {
          // Подсвечиваем путь
          const pathSet = new Set(result.path);

          setNodes((nds) =>
            nds.map((node) => ({
              ...node,
              data: {
                ...node.data,
                isOnPath: pathSet.has(node.id),
                isDimmed: !pathSet.has(node.id),
              },
            }))
          );

          // Подсвечиваем ребра на пути
          setEdges((eds) =>
            eds.map((edge) => {
              const isOnPath =
                pathSet.has(edge.source) &&
                pathSet.has(edge.target) &&
                result.path.some(
                  (nodeId, index) =>
                    index < result.path.length - 1 &&
                    ((nodeId === edge.source && result.path[index + 1] === edge.target) ||
                      (nodeId === edge.target && result.path[index + 1] === edge.source))
                );

              return {
                ...edge,
                data: {
                  ...edge.data,
                  isOnPath,
                  isDimmed: !isOnPath,
                },
                style: {
                  ...edge.style,
                  strokeWidth: isOnPath ? 3 : 1.5,
                  stroke: isOnPath ? '#22c55e' : '#6366f1',
                },
                animated: isOnPath,
              };
            })
          );
        }
      },
      [graph, setNodes, setEdges]
    );

    // Динамические стили для ребер
    const memoizedEdges = useMemo(() => {
      return edges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: edge.data?.isOnPath ? 3 : 1.5,
          stroke: edge.data?.isOnPath ? '#22c55e' : edge.data?.isDimmed ? '#475569' : '#6366f1',
          opacity: edge.data?.isDimmed ? 0.3 : 1,
        },
        animated: edge.data?.isOnPath || false,
      }));
    }, [edges]);

    if (!graph) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-xl mb-2">Нет данных для отображения</p>
            <p className="text-sm text-gray-400">Загрузите файл graph.json или используйте демо-данные</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-gray-900">
        <ReactFlow
          nodes={nodes}
          edges={memoizedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          onPaneClick={onPaneClickHandler}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-900"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.data?.isOnPath) return '#22c55e';
              if (node.data?.isHighlighted) return '#3b82f6';
              return '#6366f1';
            }}
            className="bg-gray-800"
          />
        </ReactFlow>

        {/* Панель информации о выбранной ноде */}
        {selectedNode && (
          <div style={{ position: 'absolute', top: 16, left: 16, background: '#0d0b1e', border: '1px solid #2a2554', borderRadius: 12, padding: 16, maxWidth: 320, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontWeight: 700, color: '#a37cf7', fontSize: 13 }}>Информация об узле</h3>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ color: '#5a5678', cursor: 'pointer', fontSize: 14, background: 'none', border: 'none', padding: 0 }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#c0bdd4' }}>{selectedNode}</p>
          </div>
        )}

        {/* Панель результата поиска пути */}
        {pathResult && pathResult.exists && (
          <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#0d0b1e', border: '1px solid #10b981', borderRadius: 12, padding: 16, maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontWeight: 700, color: '#10b981', fontSize: 13 }}>Маршрут найден</h3>
              <button
                onClick={internalResetHighlight}
                style={{ color: '#5a5678', cursor: 'pointer', fontSize: 14, background: 'none', border: 'none', padding: 0 }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#c0bdd4', marginBottom: 8 }}>
              <p><strong style={{ color: '#e0dff0' }}>Переходов:</strong> {pathResult.hops}</p>
              <p><strong style={{ color: '#e0dff0' }}>Суммарный вес:</strong> {pathResult.totalWeight}</p>
            </div>
            <div style={{ fontSize: 11, color: '#706a96' }}>
              <p style={{ marginBottom: 4 }}>Путь:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {pathResult.path.map((nodeId, index) => {
                  const nodeLabel = graph?.nodes.find(n => n.id === nodeId)?.label || nodeId;
                  return (
                  <React.Fragment key={nodeId}>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid rgba(16,185,129,0.25)' }}>
                      {nodeLabel}
                    </span>
                    {index < pathResult.path.length - 1 && (
                      <span style={{ color: '#5a5678' }}>→</span>
                    )}
                  </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Ошибка если путь не найден */}
        {pathResult && !pathResult.exists && (
          <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#0d0b1e', border: '1px solid #ef4444', borderRadius: 12, padding: 16, maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontWeight: 700, color: '#ef4444', fontSize: 13 }}>Маршрут не найден</h3>
              <button
                onClick={internalResetHighlight}
                style={{ color: '#5a5678', cursor: 'pointer', fontSize: 14, background: 'none', border: 'none', padding: 0 }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#c0bdd4' }}>{pathResult.message}</p>
          </div>
        )}
      </div>
    );
  }
);

GraphViewInner.displayName = 'GraphViewInner';

export const GraphView = forwardRef<GraphViewRef, GraphViewProps>((props, ref) => (
  <ReactFlowProvider>
    <GraphViewInner {...props} ref={ref} />
  </ReactFlowProvider>
));

GraphView.displayName = 'GraphView';