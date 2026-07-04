// Layout алгоритмы для графа с использованием d3-force

import { ReactFlowNode, ReactFlowEdge } from './types';
import * as d3 from 'd3';
import { getNodeSize } from './nodeSize';

/**
 * Применяет force-directed layout к нодам и ребрам
 */
export function applyForceLayout(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  options: {
    width: number;
    height: number;
    repulsion?: number;
    attraction?: number;
    damping?: number;
    iterations?: number;
  } = { width: 1200, height: 800 }
): ReactFlowNode[] {
  if (nodes.length === 0) return [];

  const {
    width,
    height,
    repulsion = 300,
    attraction = 0.1,
    damping = 0.8,
    iterations = 300,
  } = options;

  // Множество существующих ID нод
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Создаем копии данных для D3
  const nodeData = nodes.map((node) => ({
    id: node.id,
    x: width / 2 + (Math.random() - 0.5) * 200,
    y: height / 2 + (Math.random() - 0.5) * 200,
    degree: 0,
    community: node.data.community,
    data: node.data,
  }));

  // Фильтруем ребра: только тех, чьи ОБА конца есть в nodeIds!
  const edgeData = edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.data?.weight || 1,
    }));

  // Вычисляем степени нод
  nodeData.forEach((node) => {
    node.degree = edgeData.filter(
      (e) => e.source === node.id || e.target === node.id
    ).length;
  });

  try {
    // Создаем simulation
    const simulation = d3
      .forceSimulation(nodeData as any)
      .force('charge', d3.forceManyBody().strength(-repulsion * 2.5))
      .force(
        'link',
        d3
          .forceLink(edgeData as any)
          .id((d: any) => d.id)
          .strength(attraction)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => {
        // Вычисляем радиус на основе размера ноды (size / 2) + некоторый безопасный отступ
        const nodeLabel = d.data?.label || '';
        const nodeCentrality = d.data?.degree_centrality || 0.5;
        const size = getNodeSize(nodeLabel, nodeCentrality);
        return (size / 2) + 20; // 20px - безопасный отступ между кругами
      }))
      .velocityDecay(1 - damping)
      .stop();

    // Запускаем simulation
    for (let i = 0; i < iterations; i++) {
      simulation.tick();
    }
  } catch (err) {
    console.error('D3 Force simulation error:', err);
  }

  // Обновляем позиции нод
  return nodes.map((node) => {
    const simNode = nodeData.find((n) => n.id === node.id);
    return {
      ...node,
      position: simNode && !isNaN(simNode.x) && !isNaN(simNode.y)
        ? { x: simNode.x, y: simNode.y }
        : { x: Math.random() * width, y: Math.random() * height },
    };
  });
}

/**
 * Группирует ноды по сообществам
 */
export function clusterByCommunity(nodes: ReactFlowNode[]): Map<number, ReactFlowNode[]> {
  const clusters = new Map<number, ReactFlowNode[]>();
  
  nodes.forEach((node) => {
    const community = node.data.community ?? -1;
    if (!clusters.has(community)) {
      clusters.set(community, []);
    }
    clusters.get(community)!.push(node);
  });
  
  return clusters;
}

/**
 * Оптимизированный layout для больших графов
 * Использует кластеризацию для начального позиционирования
 */
export function applyOptimizedLayout(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  options: {
    width: number;
    height: number;
    iterations?: number;
  } = { width: 1200, height: 800 }
): ReactFlowNode[] {
  if (nodes.length === 0) return [];
  const { width, height, iterations = 100 } = options;
  const clusters = clusterByCommunity(nodes);
  const clusterCenters = new Map<number, { x: number; y: number }>();
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Вычисляем центры кластеров по кругу
  const clusterIds = Array.from(clusters.keys()).filter(id => id !== -1);
  const angleStep = clusterIds.length > 0 ? (2 * Math.PI) / clusterIds.length : 0;
  const radius = Math.min(width, height) * 0.35;

  clusterIds.forEach((clusterId, index) => {
    const angle = index * angleStep;
    clusterCenters.set(clusterId, {
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
    });
  });

  // Начальные позиции нод вокруг центров их кластеров
  const nodeData = nodes.map((node) => {
    const community = node.data.community ?? -1;
    const center =
      community !== -1 ? clusterCenters.get(community) : { x: width / 2, y: height / 2 };
    const clusterRadius = 100;
    const angle = Math.random() * 2 * Math.PI;
    const cx = center?.x ?? width / 2;
    const cy = center?.y ?? height / 2;
    
    return {
      id: node.id,
      x: cx + clusterRadius * Math.cos(angle),
      y: cy + clusterRadius * Math.sin(angle),
      degree: 0,
      community: community,
      data: node.data,
    };
  });

  const edgeData = edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.data?.weight || 1,
    }));

  try {
    const simulation = d3
      .forceSimulation(nodeData as any)
      .force('charge', d3.forceManyBody().strength(-350))
      .force(
        'link',
        d3
          .forceLink(edgeData as any)
          .id((d: any) => d.id)
          .strength(0.08)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => {
        const nodeLabel = d.data?.label || '';
        const nodeCentrality = d.data?.degree_centrality || 0.5;
        const size = getNodeSize(nodeLabel, nodeCentrality);
        return (size / 2) + 25; 
      }))
      .velocityDecay(0.7)
      .stop();

    for (let i = 0; i < iterations; i++) {
      simulation.tick();
    }
  } catch (err) {
    console.error('D3 Optimized simulation error:', err);
  }

  return nodes.map((node) => {
    const simNode = nodeData.find((n) => n.id === node.id);
    return {
      ...node,
      position: simNode && !isNaN(simNode.x) && !isNaN(simNode.y)
        ? { x: simNode.x, y: simNode.y }
        : node.position,
    };
  });
}

/**
 * Компактный layout для подграфов (используется при фильтрации)
 */
export function applyCompactLayout(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  options: {
    width: number;
    height: number;
  } = { width: 800, height: 600 }
): ReactFlowNode[] {
  return applyForceLayout(nodes, edges, {
    ...options,
    repulsion: 150,
    attraction: 0.2,
    damping: 0.9,
    iterations: 200,
  });
}