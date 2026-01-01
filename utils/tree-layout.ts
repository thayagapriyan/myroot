import { Member, TreeLayout } from '@/types/family';

export function calculateTreeLayout(members: Member[], screenWidth: number): TreeLayout {
  const map = new Map<string, Member>();
  members.forEach((m) => map.set(m.id, m));

  // Build adjacency for children (parent -> [children])
  const children = new Map<string, string[]>();
  members.forEach((m) => {
    const rels = m.relations || [];
    rels.forEach((r) => {
      if (r.type === 'parent') {
        // targetId is parent of m
        const arr = children.get(r.targetId) || [];
        if (!arr.includes(m.id)) arr.push(m.id);
        children.set(r.targetId, arr);
      }
      if (r.type === 'child') {
        // m is parent of targetId
        const arr = children.get(m.id) || [];
        if (!arr.includes(r.targetId)) arr.push(r.targetId);
        children.set(m.id, arr);
      }
    });
  });

  // Find roots: nodes not child of anyone
  const allIds = new Set(members.map((m) => m.id));
  const childSet = new Set<string>();
  children.forEach((vals) => vals.forEach((id) => childSet.add(id)));
  const roots = Array.from(allIds).filter((id) => !childSet.has(id));
  if (roots.length === 0 && members.length > 0) roots.push(members[0].id);

  // BFS to assign generations
  const layers: string[][] = [];
  const visited = new Set<string>();
  roots.forEach((r) => {
    if (visited.has(r)) return;
    const queue = [{ id: r, depth: 0 }];
    while (queue.length) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      if (!layers[node.depth]) layers[node.depth] = [];
      layers[node.depth].push(node.id);
      const kids = children.get(node.id) || [];
      kids.forEach((c) => queue.push({ id: c, depth: node.depth + 1 }));
    }
  });

  // Add unvisited as separate roots
  members.forEach((m) => {
    if (!visited.has(m.id)) {
      layers[0] = layers[0] || [];
      layers[0].push(m.id);
      visited.add(m.id);
    }
  });

  // Position nodes
  const positions: Record<string, { x: number; y: number }> = {};
  const levelHeight = 180; // Increased for better spacing
  const nodeWidth = 180;

  // parent map (child -> parent) to keep siblings together
  const parentOf = new Map<string, string>();
  children.forEach((kids, parent) => {
    kids.forEach((k) => {
      if (!parentOf.has(k)) parentOf.set(k, parent);
    });
  });

  // spouse map to try to keep spouses adjacent
  const spouseMap = new Map<string, string>();
  members.forEach((m) => {
    (m.relations || []).forEach((r: any) => {
      if (r.type === 'spouse' || r.type === 'partner') {
        spouseMap.set(m.id, r.targetId);
      }
    });
  });

  layers.forEach((col, ci) => {
    // sort column: primary by parent index in previous layer, secondary try spouse adjacency, tertiary by name
    if (ci > 0 && layers[ci - 1]) {
      col.sort((a, b) => {
        const pa = parentOf.get(a) || '';
        const pb = parentOf.get(b) || '';
        const prev = layers[ci - 1];
        const paIdx = prev.indexOf(pa);
        const pbIdx = prev.indexOf(pb);
        if (paIdx !== pbIdx) return (paIdx === -1 ? 9999 : paIdx) - (pbIdx === -1 ? 9999 : pbIdx);
        // keep spouses adjacent
        if (spouseMap.get(a) === b) return -1;
        if (spouseMap.get(b) === a) return 1;
        // fallback name order for stability
        return a.localeCompare(b);
      });
    }

    const y = ci * levelHeight + 100;
    const totalWidth = col.length * nodeWidth;
    const startX = Math.max(40, (screenWidth - totalWidth) / 2);
    col.forEach((id, ri) => {
      const x = startX + ri * nodeWidth;
      positions[id] = { x, y };
    });
  });

  // Edges (Parent -> Child)
  const edges: { from: string; to: string; isJoint?: boolean; parent2?: string }[] = [];
  
  // Group children by parent set
  const parentSets = new Map<string, string[]>(); // "p1:p2" -> [childIds]
  
  children.forEach((kids, parentId) => {
    kids.forEach((childId) => {
      // Check if this child has another parent who is a spouse of parentId
      const otherParent = members.find(m => {
          if (m.id === parentId) return false;
          // Check if m is spouse of parentId
          const isSpouse = m.relations?.some(r => r.targetId === parentId && (r.type === 'spouse' || r.type === 'partner'));
          // Check if m is also parent of childId
          const mKids = children.get(m.id) || [];
          return isSpouse && mKids.includes(childId);
      });

      if (otherParent) {
          // Joint parentage
          const p1 = parentId < otherParent.id ? parentId : otherParent.id;
          const p2 = parentId < otherParent.id ? otherParent.id : parentId;
          const key = `${p1}:${p2}`;
          const set = parentSets.get(key) || [];
          if (!set.includes(childId)) {
              set.push(childId);
              parentSets.set(key, set);
          }
      } else {
          edges.push({ from: parentId, to: childId });
      }
    });
  });

  // Add joint edges
  parentSets.forEach((kids, key) => {
      const [p1, p2] = key.split(':');
      kids.forEach(childId => {
          edges.push({ from: p1, to: childId, isJoint: true, parent2: p2 });
      });
  });

  // Filter out single edges that are covered by joint edges
  const finalEdges = edges.filter(e => {
      if (e.isJoint) return true;
      const isCovered = Array.from(parentSets.entries()).some(([key, kids]) => {
          const [p1, p2] = key.split(':');
          return (p1 === e.from || p2 === e.from) && kids.includes(e.to);
      });
      return !isCovered;
  });

  // Spouse Edges
  const spouseEdges: { from: string; to: string }[] = [];
  const processedPairs = new Set<string>();
  members.forEach(m => {
      m.relations?.forEach(r => {
          if (r.type === 'spouse' || r.type === 'partner') {
              const pair = [m.id, r.targetId].sort().join(':');
              if (!processedPairs.has(pair)) {
                  spouseEdges.push({ from: m.id, to: r.targetId });
                  processedPairs.add(pair);
              }
          }
      });
  });

  return { layers, positions, edges: finalEdges, spouseEdges };
}
