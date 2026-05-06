"use client";

import type { ResourceTocNode } from "@/lib/types/resource";

interface ResourceTocProps {
  nodes: ResourceTocNode[];
  selectedPath: string[] | null;
  onSelectPath: (path: string[] | null) => void;
  className?: string;
}

function TocNodeView({
  node,
  selectedPath,
  onSelectPath,
}: {
  node: ResourceTocNode;
  selectedPath: string[] | null;
  onSelectPath: (path: string[] | null) => void;
}) {
  const isSelected = selectedPath?.join(":") === node.path.join(":");
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <button
        onClick={() => onSelectPath(isSelected ? null : node.path)}
        className={`text-left flex items-center justify-between px-2 py-1.5 text-sm transition-colors rounded-md ${
          isSelected
            ? "text-archive-accent bg-archive-border/30"
            : "text-archive-subtle hover:text-archive-text hover:bg-archive-border/10"
        }`}
      >
        <span className="truncate">{node.label}</span>
        {node.resourceCount > 0 && (
          <span className="font-mono text-[10px] opacity-60 ml-2">
            {node.resourceCount}
          </span>
        )}
      </button>
      {hasChildren && (
        <div className="pl-3 mt-0.5 border-l border-archive-border/30 ml-2 flex flex-col gap-0.5">
          {node.children.map((child) => (
            <TocNodeView
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResourceToc({
  nodes,
  selectedPath,
  onSelectPath,
  className = "",
}: ResourceTocProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <h3 className="font-serif text-archive-text mb-3 px-2">Directory</h3>
      {nodes.map((node) => (
        <TocNodeView
          key={node.id}
          node={node}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
        />
      ))}
    </div>
  );
}
