// Парсер graph.json от graphify и конвертация в формат React Flow

import { GraphifyGraph, ReactFlowNode, ReactFlowEdge } from './types';

/**
 * Парсит graph.json и конвертирует ноды в формат React Flow
 */
export function parseNodes(graph: GraphifyGraph): ReactFlowNode[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: 'custom',
    position: { x: 0, y: 0 }, // Позиции будут вычислены через layout
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
}

/**
 * Парсит graph.json и конвертирует ребра в формат React Flow
 */
export function parseEdges(graph: GraphifyGraph): ReactFlowEdge[] {
  return graph.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    type: 'custom',
    animated: false,
    style: {
      strokeWidth: 1.5,
    },
    data: {
      edgeType: edge.type || 'default',
      weight: edge.weight || 1,
      confidence: edge.confidence,
      isOnPath: false,
      isDimmed: false,
    },
  }));
}

/**
 * Полный парсер graph.json
 */
export function parseGraph(graph: GraphifyGraph): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  return {
    nodes: parseNodes(graph),
    edges: parseEdges(graph),
  };
}

/**
 * Валидация структуры graph.json
 */
export function validateGraph(graph: any): graph is GraphifyGraph {
  if (!graph || typeof graph !== 'object') {
    return false;
  }

  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return false;
  }

  // Проверка базовой структуры нод
  for (const node of graph.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      return false;
    }
  }

  // Проверка базовой структуры ребер
  for (const edge of graph.edges) {
    if (!edge.source || !edge.target) {
      return false;
    }
  }

  return true;
}

/**
 * Получает уникальные типы нод
 */
export function getNodeTypes(graph: GraphifyGraph): string[] {
  const types = new Set<string>();
  graph.nodes.forEach((node) => {
    if (node.type) {
      types.add(node.type);
    }
  });
  return Array.from(types).sort();
}

/**
 * Получает уникальные типы ребер
 */
export function getEdgeTypes(graph: GraphifyGraph): string[] {
  const types = new Set<string>();
  graph.edges.forEach((edge) => {
    if (edge.type) {
      types.add(edge.type);
    }
  });
  return Array.from(types).sort();
}

/**
 * Получает количество сообществ
 */
export function getCommunityCount(graph: GraphifyGraph): number {
  const communities = new Set<number>();
  graph.nodes.forEach((node) => {
    if (node.community !== undefined) {
      communities.add(node.community);
    }
  });
  return communities.size;
}