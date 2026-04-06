"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getFilename(path: string | undefined): string {
  if (!path) return "file";
  return path.split("/").pop() || path;
}

export function getToolLabel(toolName: string, args: unknown): string {
  const a = args as Record<string, string | undefined>;

  if (toolName === "str_replace_editor") {
    const filename = getFilename(a.path);
    switch (a.command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Reading ${filename}`;
      case "undo_edit":
        return `Undoing edit in ${filename}`;
      default:
        return `Working on ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    const filename = getFilename(a.path);
    switch (a.command) {
      case "rename":
        return `Renaming ${filename}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return "Managing files";
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const isDone =
    toolInvocation.state === "result" &&
    (toolInvocation as { result?: unknown }).result;
  const label = getToolLabel(toolInvocation.toolName, toolInvocation.args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
