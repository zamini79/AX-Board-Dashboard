import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type Node,
  type Edge,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Kpi } from '@/types/database';
import { KpiFlowNode } from './KpiFlowNode';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface KpiFlowMapProps {
  kpiTree: Kpi[];
}

const NODE_WIDTH = 260;
const H_GAP = 40;
const V_GAP = 180;

const nodeTypes = { kpiNode: KpiFlowNode };

function getSubtreeWidth(kpi: Kpi, expandedIds: Set<string>): number {
  if (!kpi.children || kpi.children.length === 0) return NODE_WIDTH;
  if (!expandedIds.has(kpi.id)) return NODE_WIDTH;
  const childrenWidth = kpi.children.reduce(
    (sum, child) => sum + getSubtreeWidth(child, expandedIds),
    0
  );
  return childrenWidth + H_GAP * (kpi.children.length - 1);
}

function buildVisibleNodesAndEdges(
  kpiTree: Kpi[],
  expandedIds: Set<string>,
  deptMap: Map<string, string>,
  onToggle: (id: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function traverse(kpi: Kpi, depth: number, xOffset: number) {
    const subtreeWidth = getSubtreeWidth(kpi, expandedIds);
    const childCount = kpi.children?.length ?? 0;
    const isExpanded = expandedIds.has(kpi.id) && childCount > 0;
    const hasChildren = isExpanded;
    const nodeX = xOffset + (subtreeWidth - NODE_WIDTH) / 2;

    nodes.push({
      id: kpi.id,
      type: 'kpiNode',
      position: { x: nodeX, y: depth * V_GAP },
      data: {
        kpi,
        hasParent: !!kpi.parent_id,
        hasChildren,
        departmentName: kpi.department_id ? deptMap.get(kpi.department_id) : undefined,
        isExpanded,
        childCount,
        onToggle: () => onToggle(kpi.id),
      },
    });

    if (isExpanded && kpi.children) {
      let childX = xOffset;
      for (const child of kpi.children) {
        edges.push({
          id: `${kpi.id}-${child.id}`,
          source: kpi.id,
          target: child.id,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
          animated: false,
        });
        traverse(child, depth + 1, childX);
        childX += getSubtreeWidth(child, expandedIds) + H_GAP;
      }
    }
  }

  let currentX = 0;
  for (const root of kpiTree) {
    traverse(root, 0, currentX);
    currentX += getSubtreeWidth(root, expandedIds) + H_GAP * 3;
  }

  return { nodes, edges };
}

function buildFlatMap(kpiTree: Kpi[]): Map<string, Kpi> {
  const map = new Map<string, Kpi>();
  function walk(kpi: Kpi) {
    map.set(kpi.id, kpi);
    kpi.children?.forEach(walk);
  }
  kpiTree.forEach(walk);
  return map;
}

// Initial expanded IDs: all root KPI IDs (shows roots + their direct children)
function getInitialExpandedIds(kpiTree: Kpi[]): Set<string> {
  return new Set(kpiTree.map(k => k.id));
}

// Collect all KPI IDs that have children (for expand all)
function getAllExpandableIds(kpiTree: Kpi[]): Set<string> {
  const ids = new Set<string>();
  function walk(kpi: Kpi) {
    if (kpi.children && kpi.children.length > 0) {
      ids.add(kpi.id);
      kpi.children.forEach(walk);
    }
  }
  kpiTree.forEach(walk);
  return ids;
}

function KpiFlowMapInner({
  kpiTree,
  deptMap,
}: {
  kpiTree: Kpi[];
  deptMap: Map<string, string>;
}) {
  const { isOwnerOrAbove } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fitView } = useReactFlow();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getInitialExpandedIds(kpiTree)
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Re-fit view after layout change
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 1, duration: 300 }), 50);
  }, [fitView]);

  const handleExpandAll = useCallback(() => {
    setExpandedIds(getAllExpandableIds(kpiTree));
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 0.8, duration: 400 }), 80);
  }, [kpiTree, fitView]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(getInitialExpandedIds(kpiTree));
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 1, duration: 400 }), 80);
  }, [kpiTree, fitView]);

  const { nodes: computedNodes, edges: computedEdges } = useMemo(
    () => buildVisibleNodesAndEdges(kpiTree, expandedIds, deptMap, handleToggle),
    [kpiTree, expandedIds, deptMap, handleToggle]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Sync computed nodes/edges into ReactFlow state when they change
  React.useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  const updateSortOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase.from('kpis').update({ sort_order }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const err = results.find(r => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis'] }),
    onError: (error) => {
      toast({ variant: 'destructive', title: '정렬 순서 저장 실패', description: (error as Error).message });
    },
  });

  const flatMap = useMemo(() => buildFlatMap(kpiTree), [kpiTree]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (!isOwnerOrAbove) return;
      const kpi = flatMap.get(draggedNode.id);
      if (!kpi) return;

      const parentId = kpi.parent_id;
      const siblingIds: string[] = [];
      if (parentId) {
        const parent = flatMap.get(parentId);
        parent?.children?.forEach(c => siblingIds.push(c.id));
      } else {
        kpiTree.forEach(r => siblingIds.push(r.id));
      }
      if (siblingIds.length <= 1) return;

      const siblingPositions = siblingIds
        .map(id => { const node = nodes.find(n => n.id === id); return node ? { id, x: node.position.x } : null; })
        .filter(Boolean) as { id: string; x: number }[];

      siblingPositions.sort((a, b) => a.x - b.x);
      const oldOrder = siblingIds;
      const newOrder = siblingPositions.map(s => s.id);
      if (!oldOrder.some((id, i) => id !== newOrder[i])) return;

      updateSortOrderMutation.mutateAsync(siblingPositions.map((s, index) => ({ id: s.id, sort_order: index })));
    },
    [isOwnerOrAbove, flatMap, kpiTree, nodes, updateSortOrderMutation]
  );

  return (
    <div className="h-[600px] w-full rounded-lg border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          setTimeout(() => {
            instance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
          }, 300);
        }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
        <Controls className="!bg-card !border-border !shadow-md" />
        <MiniMap
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
          className="!bg-card !border-border"
        />
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            전체 펼치기
          </button>
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            전체 접기
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function KpiFlowMapWithProvider({ kpiTree }: KpiFlowMapProps) {
  const { departments } = useDepartments();
  const deptMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);

  // key changes when root KPI IDs change, forcing full remount
  const flowKey = useMemo(() => kpiTree.map(k => k.id).join(','), [kpiTree]);

  return (
    <ReactFlowProvider key={flowKey}>
      <KpiFlowMapInner kpiTree={kpiTree} deptMap={deptMap} />
    </ReactFlowProvider>
  );
}

export function KpiFlowMap({ kpiTree }: KpiFlowMapProps) {
  return <KpiFlowMapWithProvider kpiTree={kpiTree} />;
}
