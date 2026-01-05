import { Member } from '@/types/family';

export const findMemberNested = (list: Member[], id: string, visited = new Set<string>()): Member | undefined => {
  for (const m of list) {
    if (m.id === id) return m;
    if (visited.has(m.id)) continue;
    visited.add(m.id);
    if (m.subTree) {
      const found = findMemberNested(m.subTree, id, visited);
      if (found) return found;
    }
  }
  return undefined;
};

export const updateNestedMember = (
  targetList: Member[],
  id: string,
  updater: (m: Member) => Member,
  visited = new Set<string>()
): Member[] => {
  return targetList.map((m) => {
    if (m.id === id) {
      return updater(m);
    }
    if (visited.has(m.id)) return m;
    const nextVisited = new Set(visited);
    nextVisited.add(m.id);
    if (m.subTree) {
      return {
        ...m,
        subTree: updateNestedMember(m.subTree, id, updater, nextVisited),
      };
    }
    return m;
  });
};

export const findPathToMember = (list: Member[], id: string, path: string[] = []): string[] | null => {
  for (const m of list) {
    if (m.id === id) return [...path, m.id];
    if (m.subTree) {
      const found = findPathToMember(m.subTree, id, [...path, m.id]);
      if (found) return found;
    }
  }
  return null;
};

export const reciprocalRelation = (type: string): string => {
  switch (type) {
    case 'parent':
      return 'child';
    case 'child':
      return 'parent';
    case 'spouse':
    case 'partner':
    case 'sibling':
      return type;
    default:
      return 'other';
  }
};
