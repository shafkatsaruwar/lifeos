// Hierarchy utilities for nested structures (tasks, projects, notes, documents)

export interface TreeNode<T> {
  item: T;
  children: TreeNode<T>[];
  level: number;
}

// Build a tree from a flat array with parent IDs
export function buildTree<T extends { id: string | number; parentId?: string | number | null }>(
  items: T[],
  parentId?: string | number | null
): TreeNode<T>[] {
  return items
    .filter(item => (parentId === undefined ? !item.parentId : item.parentId === parentId))
    .map(item => ({
      item,
      children: buildTree(items, item.id),
      level: 0,
    }))
    .map((node) => addLevels(node, 0));
}

// Add level info to tree nodes recursively
function addLevels<T>(node: TreeNode<T>, level: number): TreeNode<T> {
  return {
    ...node,
    level,
    children: node.children.map(child => addLevels(child, level + 1)),
  };
}

// Get all descendants of a node
export function getDescendants<T>(node: TreeNode<T>): T[] {
  return [
    node.item,
    ...node.children.flatMap(child => getDescendants(child)),
  ];
}

// Get all ancestors (parents up the chain)
export function getAncestors<T extends { id: string | number; parentId?: string | number | null }>(
  itemId: string | number,
  allItems: T[]
): T[] {
  const item = allItems.find(i => i.id === itemId);
  if (!item || !item.parentId) return [];
  const parent = allItems.find(i => i.id === item.parentId);
  if (!parent) return [];
  return [parent, ...getAncestors(parent.id, allItems)];
}

// Flatten tree back to array with levels
export function flattenTree<T>(nodes: TreeNode<T>[]): Array<T & { _level: number }> {
  return nodes.flatMap(node => [
    { ...node.item, _level: node.level },
    ...flattenTree(node.children),
  ]);
}

// Check if item has children
export function hasChildren<T extends { id: string | number }>(
  itemId: string | number,
  allItems: Array<T & { parentId?: string | number | null }>
): boolean {
  return allItems.some(item => item.parentId === itemId);
}

// Get immediate children
export function getChildren<T extends { id: string | number; parentId?: string | number | null }>(
  itemId: string | number,
  allItems: T[]
): T[] {
  return allItems.filter(item => item.parentId === itemId);
}

// Count descendants
export function countDescendants<T extends { id: string | number; parentId?: string | number | null }>(
  itemId: string | number,
  allItems: T[]
): number {
  const children = getChildren(itemId, allItems);
  return children.length + children.reduce((sum, child) => sum + countDescendants(child.id, allItems), 0);
}
