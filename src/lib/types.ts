// TypeScript типы для работы с графами

// Структура graph.json от graphify
export interface GraphifyNode {
  id: string;
  label: string;
  type?: string;
  source_file?: string;
  source_location?: string;
  confidence?: number;
  community?: number;
  degree_centrality?: number;
  betweenness_centrality?: number;
  metadata?: Record<string, any>;
}

export interface GraphifyEdge {
  source: string;
  target: string;
  type?: string;
  weight?: number;
  confidence?: number;
  source_location?: string;
  metadata?: Record<string, any>;
}

export interface GraphifyGraph {
  nodes: GraphifyNode[];
  edges: GraphifyEdge[];
  communities?: Record<number, string>;
  metadata?: {
    total_nodes: number;
    total_edges: number;
    total_communities: number;
    generated_at: string;
  };
}

// Типы для React Flow
export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType?: string;
    community?: number;
    confidence?: number;
    degree_centrality?: number;
    betweenness_centrality?: number;
    source_file?: string;
    source_location?: string;
    isHighlighted?: boolean;
    isOnPath?: boolean;
    isDimmed?: boolean;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: {
    edgeType?: string;
    weight?: number;
    confidence?: number;
    isOnPath?: boolean;
    isDimmed?: boolean;
  };
}

// Результат поиска пути
export interface PathResult {
  path: string[];
  totalWeight: number;
  hops: number;
  exists: boolean;
  message?: string;
}

// Настройки визуализации
export interface VisualizationSettings {
  nodeSize: number;
  edgeWidth: number;
  fontSize: number;
  physics: {
    repulsion: number;
    attraction: number;
    damping: number;
  };
  colors: {
    default: string;
    highlighted: string;
    onPath: string;
    dimmed: string;
  };
  showCommunities: boolean;
  showLabels: boolean;
  filterNodeTypes: string[];
  filterEdgeTypes: string[];
}

// Типы для поиска
export interface SearchResult {
  nodes: GraphifyNode[];
  query: string;
  total: number;
}