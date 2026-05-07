import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PerformanceGoal } from '@/types/database';
import { GoalFlowNode } from './GoalFlowNode';
import { useDepartments } from '@/hooks/useDepartments';

interface GoalFlowMapProps {
  goalTree: PerformanceGoal[];
}

const NODE_WIDTH = 260;
const H_GAP = 40;
const V_GAP = 160;

const nodeTypes = { goalNode: GoalFlowNode };

function getSubtreeWidth(goal: PerformanceGoal): number {
  if (!goal.children || goal.children.length === 0) return NODE_WIDTH;
  const childrenWidth = goal.children.reduce((sum, child) => sum + getSubtreeWidth(child), 0);
  return childrenWidth + H_GAP * (goal.children.length - 1);
}

function buildNodesAndEdges(
  goalTree: PerformanceGoal[],
  deptMap: Map<string, string>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function traverse(goal: PerformanceGoal, depth: number, xOffset: number): number {
    const subtreeWidth = getSubtreeWidth(goal);
    const hasChildren = !!goal.children && goal.children.length > 0;
    const nodeX = xOffset + (subtreeWidth - NODE_WIDTH) / 2;

    nodes.push({
      id: goal.id,
      type: 'goalNode',
      position: { x: nodeX, y: depth * V_GAP },
      data: {
        goal,
        hasParent: !!goal.parent_id,
        hasChildren,
        departmentName: goal.department_id ? deptMap.get(goal.department_id) : undefined,
      },
    });

    if (hasChildren) {
      let childX = xOffset;
      for (const child of goal.children!) {
        edges.push({
          id: `${goal.id}-${child.id}`,
          source: goal.id,
          target: child.id,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
          animated: false,
        });
        traverse(child, depth + 1, childX);
        childX += getSubtreeWidth(child) + H_GAP;
      }
    }

    return subtreeWidth;
  }

  let currentX = 0;
  for (const root of goalTree) {
    traverse(root, 0, currentX);
    currentX += getSubtreeWidth(root) + H_GAP * 3;
  }

  return { nodes, edges };
}

export function GoalFlowMap({ goalTree }: GoalFlowMapProps) {
  const { departments } = useDepartments();
  const deptMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(goalTree, deptMap),
    [goalTree, deptMap]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const onNodeDragStop = useCallback(() => {}, []);

  return (
    <div className="h-[600px] w-full rounded-lg border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
        <Controls className="!bg-card !border-border !shadow-md" />
        <MiniMap
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
          className="!bg-card !border-border"
        />
      </ReactFlow>
    </div>
  );
}
