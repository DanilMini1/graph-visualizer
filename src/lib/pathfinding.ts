// Алгоритмы поиска кратчайшего пути в графе

import { GraphifyGraph, PathResult, GraphifyEdge } from './types';

/**
 * Строит adjacency list для быстрого доступа к соседям
 */
function buildAdjacencyList(graph: GraphifyGraph): Map<string, { target: string; weight: number; edge: GraphifyEdge }[]> {
  const adjList = new Map<string, { target: string; weight: number; edge: GraphifyEdge }[]>();
  
  // Инициализируем все ноды
  graph.nodes.forEach(node => {
    adjList.set(node.id, []);
  });
  
  // Добавляем ребра
  graph.edges.forEach(edge => {
    const neighbors = adjList.get(edge.source) || [];
    neighbors.push({
      target: edge.target,
      weight: edge.weight || 1,
      edge
    });
    adjList.set(edge.source, neighbors);
    
    // Если граф ненаправленный, добавляем обратное ребро
    // (это зависит от того, как graphify генерирует граф)
    const reverseNeighbors = adjList.get(edge.target) || [];
    reverseNeighbors.push({
      target: edge.source,
      weight: edge.weight || 1,
      edge
    });
    adjList.set(edge.target, reverseNeighbors);
  });
  
  return adjList;
}

/**
 * BFS (Breadth-First Search) для поиска кратчайшего пути в невзвешенном графе
 */
export function findShortestPathBFS(
  graph: GraphifyGraph,
  startNodeId: string,
  endNodeId: string
): PathResult {
  if (!graph.nodes.find(n => n.id === startNodeId)) {
    return { path: [], totalWeight: 0, hops: 0, exists: false, message: 'Начальный узел не найден' };
  }
  
  if (!graph.nodes.find(n => n.id === endNodeId)) {
    return { path: [], totalWeight: 0, hops: 0, exists: false, message: 'Конечный узел не найден' };
  }
  
  if (startNodeId === endNodeId) {
    return { path: [startNodeId], totalWeight: 0, hops: 0, exists: true };
  }
  
  const adjList = buildAdjacencyList(graph);
  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[] }[] = [{ nodeId: startNodeId, path: [startNodeId] }];
  visited.add(startNodeId);
  
  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;
    
    const neighbors = adjList.get(nodeId) || [];
    for (const { target } of neighbors) {
      if (target === endNodeId) {
        const newPath = [...path, target];
        return {
          path: newPath,
          totalWeight: newPath.length - 1,
          hops: newPath.length - 1,
          exists: true
        };
      }
      
      if (!visited.has(target)) {
        visited.add(target);
        queue.push({ nodeId: target, path: [...path, target] });
      }
    }
  }
  
  return { 
    path: [], 
    totalWeight: 0, 
    hops: 0, 
    exists: false, 
    message: 'Маршрут между узлами не существует' 
  };
}

/**
 * Dijkstra's algorithm для поиска кратчайшего пути во взвешенном графе
 */
export function findShortestPathDijkstra(
  graph: GraphifyGraph,
  startNodeId: string,
  endNodeId: string
): PathResult {
  if (!graph.nodes.find(n => n.id === startNodeId)) {
    return { path: [], totalWeight: 0, hops: 0, exists: false, message: 'Начальный узел не найден' };
  }
  
  if (!graph.nodes.find(n => n.id === endNodeId)) {
    return { path: [], totalWeight: 0, hops: 0, exists: false, message: 'Конечный узел не найден' };
  }
  
  if (startNodeId === endNodeId) {
    return { path: [startNodeId], totalWeight: 0, hops: 0, exists: true };
  }
  
  const adjList = buildAdjacencyList(graph);
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const unvisited = new Set<string>();
  
  // Инициализация
  graph.nodes.forEach(node => {
    distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
    unvisited.add(node.id);
  });
  
  while (unvisited.size > 0) {
    // Находим ноду с минимальным расстоянием
    let currentNode: string | null = null;
    let minDist = Infinity;
    
    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId) ?? Infinity;
      if (dist < minDist) {
        minDist = dist;
        currentNode = nodeId;
      }
    }
    
    if (currentNode === null || minDist === Infinity) {
      break; // Достигли недоступных нод
    }
    
    if (currentNode === endNodeId) {
      // Восстанавливаем путь
      const path: string[] = [];
      let current: string | undefined = endNodeId;
      
      while (current !== undefined) {
        path.unshift(current);
        current = previous.get(current);
      }
      
      return {
        path,
        totalWeight: minDist,
        hops: path.length - 1,
        exists: true
      };
    }
    
    unvisited.delete(currentNode);
    
    const neighbors = adjList.get(currentNode) || [];
    for (const { target, weight } of neighbors) {
      if (unvisited.has(target)) {
        const alt = (distances.get(currentNode) ?? 0) + weight;
        if (alt < (distances.get(target) ?? Infinity)) {
          distances.set(target, alt);
          previous.set(target, currentNode);
        }
      }
    }
  }
  
  return { 
    path: [], 
    totalWeight: 0, 
    hops: 0, 
    exists: false, 
    message: 'Маршрут между узлами не существует' 
  };
}

/**
 * Умный выбор алгоритма в зависимости от наличия весов
 */
export function findShortestPath(
  graph: GraphifyGraph,
  startNodeId: string,
  endNodeId: string,
  useWeights: boolean = true
): PathResult {
  // Проверяем, есть ли взвешенные ребра
  const hasWeightedEdges = graph.edges.some(edge => 
    edge.weight !== undefined && edge.weight !== 1
  );
  
  if (useWeights && hasWeightedEdges) {
    return findShortestPathDijkstra(graph, startNodeId, endNodeId);
  } else {
    return findShortestPathBFS(graph, startNodeId, endNodeId);
  }
}

/**
 * Находит все кратчайшие пути между двумя нодами (если их несколько)
 */
export function findAllShortestPaths(
  graph: GraphifyGraph,
  startNodeId: string,
  endNodeId: string
): PathResult[] {
  // Для начала используем обычный поиск для получения длины
  const firstPath = findShortestPath(graph, startNodeId, endNodeId);
  
  if (!firstPath.exists) {
    return [firstPath];
  }
  
  const targetLength = firstPath.hops;
  const allPaths: PathResult[] = [firstPath];
  
  // В реальном приложении здесь можно добавить логику
  // для нахождения всех путей одинаковой длины
  // используя модифицированный BFS
  
  return allPaths;
}

/**
 * Находит k кратчайших путей (Yen's algorithm - упрощенная версия)
 */
export function findKShortestPaths(
  graph: GraphifyGraph,
  startNodeId: string,
  endNodeId: string,
  k: number = 3
): PathResult[] {
  const paths: PathResult[] = [];
  const firstPath = findShortestPath(graph, startNodeId, endNodeId);
  
  if (!firstPath.exists) {
    return [firstPath];
  }
  
  paths.push(firstPath);
  
  // В реальном приложении здесь можно реализовать полный Yen's algorithm
  // для поиска k альтернативных путей
  
  return paths;
}

/**
 * Вычисляет метрики пути
 */
export function getPathMetrics(
  graph: GraphifyGraph,
  path: string[]
): {
  totalWeight: number;
  hops: number;
  avgConfidence: number;
  edgeTypes: string[];
  nodeTypes: string[];
} {
  if (path.length < 2) {
    return {
      totalWeight: 0,
      hops: 0,
      avgConfidence: 1,
      edgeTypes: [],
      nodeTypes: []
    };
  }
  
  let totalWeight = 0;
  let totalConfidence = 0;
  let confidenceCount = 0;
  const edgeTypes = new Set<string>();
  const nodeTypes = new Set<string>();
  
  // Считаем метрики по ребрам
  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.edges.find(
      e => (e.source === path[i] && e.target === path[i + 1]) ||
          (e.source === path[i + 1] && e.target === path[i])
    );
    
    if (edge) {
      totalWeight += edge.weight || 1;
      if (edge.confidence !== undefined) {
        totalConfidence += edge.confidence;
        confidenceCount++;
      }
      if (edge.type) {
        edgeTypes.add(edge.type);
      }
    }
  }
  
  // Собираем типы нод
  path.forEach(nodeId => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (node && node.type) {
      nodeTypes.add(node.type);
    }
  });
  
  return {
    totalWeight,
    hops: path.length - 1,
    avgConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 1,
    edgeTypes: Array.from(edgeTypes),
    nodeTypes: Array.from(nodeTypes)
  };
}