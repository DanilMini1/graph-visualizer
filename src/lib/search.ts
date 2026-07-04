// Поиск по нодам графа
import { GraphifyGraph, GraphifyNode, SearchResult } from './types';

/**
 * Индекс для быстрого поиска нод
 */
class NodeSearchIndex {
  private nodes: GraphifyNode[] = [];
  private labelIndex: Map<string, GraphifyNode[]> = new Map();
  private typeIndex: Map<string, GraphifyNode[]> = new Map();
  private communityIndex: Map<number, GraphifyNode[]> = new Map();

  buildIndex(graph: GraphifyGraph): void {
    this.nodes = graph.nodes;
    this.labelIndex.clear();
    this.typeIndex.clear();
    this.communityIndex.clear();

    graph.nodes.forEach(node => {
      // Индекс по label (по словам)
      const words = node.label.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          if (!this.labelIndex.has(word)) {
            this.labelIndex.set(word, []);
          }
          this.labelIndex.get(word)!.push(node);
        }
      });

      // Индекс по типу
      if (node.type) {
        if (!this.typeIndex.has(node.type)) {
          this.typeIndex.set(node.type, []);
        }
        this.typeIndex.get(node.type)!.push(node);
      }

      // Индекс по сообществу
      if (node.community !== undefined) {
        if (!this.communityIndex.has(node.community)) {
          this.communityIndex.set(node.community, []);
        }
        this.communityIndex.get(node.community)!.push(node);
      }
    });
  }

  search(query: string, filters?: {
    nodeTypes?: string[];
    communities?: number[];
  }): GraphifyNode[] {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
      return [];
    }

    // Собираем кандидатов по каждому слову
    const candidates = new Map<string, { node: GraphifyNode; score: number }>();

    words.forEach(word => {
      const matchingNodes = this.labelIndex.get(word) || [];
      matchingNodes.forEach(node => {
        const existing = candidates.get(node.id);
        const score = this.calculateRelevance(node, query);

        if (existing) {
          existing.score += score;
        } else {
          candidates.set(node.id, { node, score });
        }
      });
    });

    // Применяем фильтры
    let results = Array.from(candidates.values())
      .filter(({ node }) => {
        if (filters?.nodeTypes && filters.nodeTypes.length > 0) {
          if (!node.type || !filters.nodeTypes.includes(node.type)) {
            return false;
          }
        }
        if (filters?.communities && filters.communities.length > 0) {
          if (node.community === undefined || !filters.communities.includes(node.community)) {
            return false;
          }
        }
        return true;
      });

    // Сортируем по релевантности
    results.sort((a, b) => b.score - a.score);

    return results.map(r => r.node);
  }

  private calculateRelevance(node: GraphifyNode, query: string): number {
    const lowerLabel = node.label.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Точное совпадение
    if (lowerLabel === lowerQuery) {
      score += 100;
    }
    // Начинается с query
    else if (lowerLabel.startsWith(lowerQuery)) {
      score += 50;
    }
    // Содержит query
    else if (lowerLabel.includes(lowerQuery)) {
      score += 20;
    }

    // Бонус за совпадение типа
    if (node.type && node.type.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // Бонус за высокую степень центральности
    if (node.degree_centrality) {
      score += node.degree_centrality * 5;
    }

    return score;
  }

  getByType(type: string): GraphifyNode[] {
    return this.typeIndex.get(type) || [];
  }

  getByCommunity(community: number): GraphifyNode[] {
    return this.communityIndex.get(community) || [];
  }

  getAllNodes(): GraphifyNode[] {
    return this.nodes;
  }
}

// Глобальный индекс
let searchIndex: NodeSearchIndex | null = null;

/**
 * Инициализирует поисковый индекс
 */
export function initializeSearch(graph: GraphifyGraph): void {
  if (!searchIndex) {
    searchIndex = new NodeSearchIndex();
  }
  searchIndex.buildIndex(graph);
}

/**
 * Выполняет поиск по нодам
 */
export function searchNodes(
  query: string,
  filters?: {
    nodeTypes?: string[];
    communities?: number[];
  }
): SearchResult {
  if (!searchIndex) {
    return { nodes: [], query, total: 0 };
  }

  const results = searchIndex.search(query, filters);

  return {
    nodes: results,
    query,
    total: results.length
  };
}

/**
 * Получает автокомплит для поисковой строки
 */
export function getAutocompleteSuggestions(
  query: string,
  limit: number = 10
): GraphifyNode[] {
  if (!searchIndex || query.length < 2) {
    return [];
  }

  return searchIndex.search(query).slice(0, limit);
}

/**
 * Получает ноду по ID
 */
export function getNodeById(nodeId: string): GraphifyNode | undefined {
  if (!searchIndex) {
    return undefined;
  }

  return searchIndex.getAllNodes().find(n => n.id === nodeId);
}

/**
 * Получает соседей ноды
 */
export function getNodeNeighbors(
  nodeId: string,
  graph: GraphifyGraph
): {
  incoming: GraphifyNode[];
  outgoing: GraphifyNode[];
  all: GraphifyNode[];
} {
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
  const incoming = new Set<GraphifyNode>();
  const outgoing = new Set<GraphifyNode>();

  graph.edges.forEach(edge => {
    if (edge.target === nodeId) {
      const source = nodeMap.get(edge.source);
      if (source) incoming.add(source);
    }
    if (edge.source === nodeId) {
      const target = nodeMap.get(edge.target);
      if (target) outgoing.add(target);
    }
  });

  return {
    incoming: Array.from(incoming),
    outgoing: Array.from(outgoing),
    all: [...incoming, ...outgoing]
  };
}