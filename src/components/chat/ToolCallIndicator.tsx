"use client";

import { Loader2 } from "lucide-react";

interface ToolCallIndicatorProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  hasResult: boolean;
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const command = args.command as string | undefined;
  const path = args.path as string | undefined;
  const fileName = path ? getFileName(path) : "";

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return `Created ${fileName}`;
      case "str_replace":
        return `Edited ${fileName}`;
      case "insert":
        return `Inserted into ${fileName}`;
      case "view":
        return `Viewing ${fileName}`;
      default:
        return `Modified ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    const newPath = args.new_path as string | undefined;
    switch (command) {
      case "rename":
        return `Renamed ${fileName}${newPath ? ` → ${getFileName(newPath)}` : ""}`;
      case "delete":
        return `Deleted ${fileName}`;
      default:
        return `Modified ${fileName}`;
    }
  }

  return toolName;
}

export function ToolCallIndicator({ toolName, args, state, hasResult }: ToolCallIndicatorProps) {
  const label = getLabel(toolName, args);
  const isDone = state === "result" && hasResult;

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
