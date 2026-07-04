'use client';

import React from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { getNodeSize } from '@/lib/nodeSize';

export type CustomNodeType = Node<{
  label: string;
  nodeType?: string;
  community?: number;
  confidence?: number;
  degree_centrality?: number;
  betweenness_centrality?: number;
  isHighlighted?: boolean;
  isOnPath?: boolean;
  isDimmed?: boolean;
}, 'custom'>;

export const CustomNode: React.FC<NodeProps<CustomNodeType>> = ({ data, selected }) => {
  const getNodeColor = () => {
    if (data.isOnPath) return '#22c55e'; // green
    if (data.isHighlighted) return '#3b82f6'; // blue
    if (data.isDimmed) return '#94a3b8'; // slate-400
    return '#6366f1'; // indigo-500
  };

  const size = getNodeSize(data.label || '', data.degree_centrality);
  const color = getNodeColor();

  const getFontSize = () => {
    const textLen = data.label ? data.label.length : 0;
    if (textLen < 8) return 13;
    if (textLen < 15) return 11;
    if (textLen < 22) return 10;
    return 9;
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: selected ? '3px solid #fbbf24' : '2px solid #ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: data.isDimmed ? 0.4 : 1,
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
      }}
      className="node-content hover:scale-105"
    >
      <div
        style={{
          color: 'white',
          fontSize: getFontSize(),
          fontWeight: '705',
          lineHeight: '1.2',
          textAlign: 'center',
          padding: '6px 8px',
          overflow: 'visible',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          maxWidth: '100%',
        }}
        title={data.label}
      >
        {data.label}
      </div>
      
      {/* Handle для входящих связей */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#fff', border: '2px solid #6366f1' }}
      />
      
      {/* Handle для исходящих связей */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#fff', border: '2px solid #6366f1' }}
      />
    </div>
  );
};