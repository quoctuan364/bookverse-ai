export type CategoryMappingConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNMAPPED";
export type CategoryMappingRule =
  | "root-category"
  | "parent-category"
  | "exact-name"
  | "manual-rule"
  | "fallback-other"
  | "unmapped";

export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  level: number | null;
}

export interface CanonicalRule {
  canonicalKey: string;
  canonicalName: string;
}

export interface CategoryCanonicalEntry {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  level: number | null;
  canonicalKey: string;
  canonicalName: string;
  mappingRule: CategoryMappingRule;
  confidence: CategoryMappingConfidence;
}

export interface ParentAssignmentValidation {
  orphans: string[];
  selfParents: string[];
  cycles: string[][];
  levelMismatches: string[];
}

// Bảng rule được duyệt từ đúng 43 root category của dataset, không fuzzy matching.
export const CANONICAL_ROOT_RULES: Readonly<Record<string, CanonicalRule>> = {
  C001: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C002: { canonicalKey: "artificial-intelligence", canonicalName: "Trí tuệ nhân tạo" },
  C003: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C004: { canonicalKey: "data-science", canonicalName: "Khoa học dữ liệu" },
  C005: { canonicalKey: "business", canonicalName: "Kinh doanh và quản trị" },
  C006: { canonicalKey: "marketing", canonicalName: "Marketing" },
  C007: { canonicalKey: "personal-finance", canonicalName: "Tài chính cá nhân" },
  C008: { canonicalKey: "self-help", canonicalName: "Kỹ năng và phát triển bản thân" },
  C009: { canonicalKey: "psychology", canonicalName: "Tâm lý học" },
  C010: { canonicalKey: "literature", canonicalName: "Văn học" },
  C011: { canonicalKey: "literature", canonicalName: "Văn học" },
  C012: { canonicalKey: "mystery", canonicalName: "Trinh thám" },
  C013: { canonicalKey: "fantasy", canonicalName: "Kỳ ảo" },
  C014: { canonicalKey: "science-fiction", canonicalName: "Khoa học viễn tưởng" },
  C015: { canonicalKey: "history", canonicalName: "Lịch sử" },
  C016: { canonicalKey: "philosophy", canonicalName: "Triết học" },
  C017: { canonicalKey: "education", canonicalName: "Giáo dục và ngoại ngữ" },
  C018: { canonicalKey: "education", canonicalName: "Giáo dục và ngoại ngữ" },
  C019: { canonicalKey: "children", canonicalName: "Thiếu nhi" },
  C020: { canonicalKey: "health", canonicalName: "Sức khỏe" },
  C021: { canonicalKey: "arts", canonicalName: "Nghệ thuật và nhiếp ảnh" },
  C022: { canonicalKey: "design", canonicalName: "Thiết kế và UX/UI" },
  C023: { canonicalKey: "arts", canonicalName: "Nghệ thuật và nhiếp ảnh" },
  C024: { canonicalKey: "travel", canonicalName: "Du lịch" },
  C025: { canonicalKey: "law", canonicalName: "Luật" },
  C026: { canonicalKey: "engineering", canonicalName: "Kỹ thuật" },
  C027: { canonicalKey: "environment", canonicalName: "Môi trường" },
  C028: { canonicalKey: "business", canonicalName: "Kinh doanh và quản trị" },
  C029: { canonicalKey: "business", canonicalName: "Kinh doanh và quản trị" },
  C030: { canonicalKey: "business", canonicalName: "Kinh doanh và quản trị" },
  C031: { canonicalKey: "design", canonicalName: "Thiết kế và UX/UI" },
  C032: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C033: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C034: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C035: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C036: { canonicalKey: "technology", canonicalName: "Công nghệ" },
  C037: { canonicalKey: "artificial-intelligence", canonicalName: "Trí tuệ nhân tạo" },
  C038: { canonicalKey: "artificial-intelligence", canonicalName: "Trí tuệ nhân tạo" },
  C039: { canonicalKey: "data-science", canonicalName: "Khoa học dữ liệu" },
  C040: { canonicalKey: "mathematics", canonicalName: "Toán học" },
  C041: { canonicalKey: "biography", canonicalName: "Tiểu sử và tự truyện" },
  C042: { canonicalKey: "culture", canonicalName: "Văn hóa" },
  C043: { canonicalKey: "ebooks", canonicalName: "Sách điện tử" },
};

function nodeMap(nodes: CategoryNode[]): Map<string, CategoryNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function detectCategoryCycles(nodes: CategoryNode[]): string[][] {
  const byId = nodeMap(nodes);
  const state = new Map<string, 0 | 1 | 2>();
  const cycles: string[][] = [];
  const cycleKeys = new Set<string>();

  function visit(id: string, stack: string[]): void {
    const currentState = state.get(id) ?? 0;
    if (currentState === 2) {
      return;
    }
    if (currentState === 1) {
      const start = stack.indexOf(id);
      const cycle = start >= 0 ? [...stack.slice(start), id] : [id, id];
      const key = [...new Set(cycle)].sort().join("|");
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        cycles.push(cycle);
      }
      return;
    }

    state.set(id, 1);
    const node = byId.get(id);
    if (node?.parentId && byId.has(node.parentId)) {
      visit(node.parentId, [...stack, id]);
    }
    state.set(id, 2);
  }

  for (const node of nodes) {
    visit(node.id, []);
  }

  return cycles.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}

export function calculateCategoryDepth(
  categoryId: string,
  nodes: CategoryNode[],
): number | null {
  const byId = nodeMap(nodes);
  const visited = new Set<string>();
  let current = byId.get(categoryId);
  let depth = 0;

  if (!current) {
    return null;
  }

  while (current.parentId) {
    if (visited.has(current.id)) {
      return null;
    }
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) {
      return null;
    }
    current = parent;
    depth += 1;
  }

  return depth;
}

export function validateParentAssignments(nodes: CategoryNode[]): ParentAssignmentValidation {
  const byId = nodeMap(nodes);
  const orphans = nodes
    .filter((node) => node.parentId && !byId.has(node.parentId))
    .map((node) => node.id)
    .sort();
  const selfParents = nodes
    .filter((node) => node.parentId === node.id)
    .map((node) => node.id)
    .sort();
  const levelMismatches = nodes
    .filter((node) => {
      if (!node.parentId || node.level === null) {
        return false;
      }
      const parent = byId.get(node.parentId);
      return parent?.level !== null && typeof parent?.level !== "undefined"
        ? node.level !== parent.level + 1
        : false;
    })
    .map((node) => node.id)
    .sort();

  return {
    orphans,
    selfParents,
    cycles: detectCategoryCycles(nodes),
    levelMismatches,
  };
}

function resolveRoot(node: CategoryNode, byId: Map<string, CategoryNode>): CategoryNode | null {
  const visited = new Set<string>();
  let current: CategoryNode | undefined = node;

  while (current?.parentId) {
    if (visited.has(current.id)) {
      return null;
    }
    visited.add(current.id);
    current = byId.get(current.parentId);
  }

  return current ?? null;
}

export function resolveCanonicalCategory(
  node: CategoryNode,
  nodes: CategoryNode[],
  rules: Readonly<Record<string, CanonicalRule>> = CANONICAL_ROOT_RULES,
): CategoryCanonicalEntry {
  const byId = nodeMap(nodes);
  const root = resolveRoot(node, byId);
  const canonicalRule = root ? rules[root.id] : undefined;

  if (!root || !canonicalRule) {
    return {
      categoryId: node.id,
      categoryName: node.name,
      parentId: node.parentId,
      level: node.level,
      canonicalKey: "unmapped",
      canonicalName: "Chưa ánh xạ",
      mappingRule: "unmapped",
      confidence: "UNMAPPED",
    };
  }

  return {
    categoryId: node.id,
    categoryName: node.name,
    parentId: node.parentId,
    level: node.level,
    canonicalKey: canonicalRule.canonicalKey,
    canonicalName: canonicalRule.canonicalName,
    mappingRule: node.parentId ? "parent-category" : "manual-rule",
    confidence: "HIGH",
  };
}

export function buildCategoryCanonicalMapping(
  nodes: CategoryNode[],
  rules: Readonly<Record<string, CanonicalRule>> = CANONICAL_ROOT_RULES,
): CategoryCanonicalEntry[] {
  return [...nodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => resolveCanonicalCategory(node, nodes, rules));
}

export function getCategoryDisplayName(category: {
  name: string;
  canonicalName?: string | null;
  parent?: { name: string } | null;
}): string {
  return category.canonicalName ?? category.parent?.name ?? category.name;
}
