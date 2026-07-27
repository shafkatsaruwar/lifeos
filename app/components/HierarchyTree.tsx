'use client';

import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface HierarchyItem {
  id: string;
  title: string;
  parentId?: string | null;
}

interface TreeNode<T> {
  item: T;
  children: TreeNode<T>[];
  level: number;
}

interface HierarchyTreeProps<T extends HierarchyItem> {
  items: T[];
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onSelectItem: (item: T) => void;
  renderItem: (item: T, level: number, isExpanded: boolean, hasChildren: boolean) => React.ReactNode;
  className?: string;
}

function buildTree<T extends HierarchyItem>(
  items: T[],
  parentId?: string | null
): TreeNode<T>[] {
  return items
    .filter(item => (parentId === undefined ? !item.parentId : item.parentId === parentId))
    .map(item => ({
      item,
      children: buildTree(items, item.id),
      level: 0,
    }))
    .map((node, _, roots) => addLevels(node, 0));
}

function addLevels<T>(node: TreeNode<T>, level: number): TreeNode<T> {
  return {
    ...node,
    level,
    children: node.children.map(child => addLevels(child, level + 1)),
  };
}

export function HierarchyTree<T extends HierarchyItem>({
  items,
  expandedNodes,
  onToggleExpand,
  onSelectItem,
  renderItem,
  className = '',
}: HierarchyTreeProps<T>) {
  const tree = buildTree(items);

  const renderNode = (node: TreeNode<T>): React.ReactNode => {
    const isExpanded = expandedNodes.has(String(node.item.id));
    const hasChildren = node.children.length > 0;
    const nodeId = String(node.item.id);

    return (
      <div key={nodeId} className={`hierarchy-node level-${node.level}`} style={{ marginLeft: `${node.level * 20}px` }}>
        <div className="node-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasChildren ? (
            <button
              className="expand-button"
              onClick={() => onToggleExpand(nodeId)}
              style={{
                padding: '4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}
          <div
            className="node-content"
            style={{ flex: 1, cursor: 'pointer' }}
            onClick={() => onSelectItem(node.item)}
          >
            {renderItem(node.item, node.level, isExpanded, hasChildren)}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="node-children">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`hierarchy-tree ${className}`}>
      {tree.map(node => renderNode(node))}
    </div>
  );
}

export default HierarchyTree;
