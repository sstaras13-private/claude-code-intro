import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel ---

test("str_replace_editor create command", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src/App.jsx" })).toBe("Creating App.jsx");
});

test("str_replace_editor str_replace command", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/components/Button.tsx" })).toBe("Editing Button.tsx");
});

test("str_replace_editor insert command", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/index.ts" })).toBe("Editing index.ts");
});

test("str_replace_editor view command", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "src/App.jsx" })).toBe("Reading App.jsx");
});

test("str_replace_editor undo_edit command", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "src/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("str_replace_editor unknown command falls back to Working on", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown", path: "src/App.jsx" })).toBe("Working on App.jsx");
});

test("str_replace_editor missing command falls back to Working on", () => {
  expect(getToolLabel("str_replace_editor", { path: "src/App.jsx" })).toBe("Working on App.jsx");
});

test("str_replace_editor missing path uses 'file'", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("str_replace_editor uses only the filename from the path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "deeply/nested/folder/MyComponent.tsx" })).toBe("Creating MyComponent.tsx");
});

test("file_manager rename command", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "src/Old.jsx" })).toBe("Renaming Old.jsx");
});

test("file_manager delete command", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "src/Old.jsx" })).toBe("Deleting Old.jsx");
});

test("file_manager unknown command falls back to Managing files", () => {
  expect(getToolLabel("file_manager", { command: "unknown", path: "src/App.jsx" })).toBe("Managing files");
});

test("file_manager missing command falls back to Managing files", () => {
  expect(getToolLabel("file_manager", {})).toBe("Managing files");
});

test("unknown tool name returns tool name as-is", () => {
  expect(getToolLabel("some_other_tool", { command: "create", path: "src/App.jsx" })).toBe("some_other_tool");
});

// --- ToolCallBadge component ---

test("ToolCallBadge shows correct label when state is result", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/Card.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
});

test("ToolCallBadge shows correct label when state is call (in-progress)", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "src/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("ToolCallBadge shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/Card.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).toBeDefined();
  expect(dot).not.toBeNull();
});

test("ToolCallBadge shows spinner when in progress", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/Card.jsx" },
        state: "call",
      }}
    />
  );
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
  expect(spinner).not.toBeNull();
});

test("ToolCallBadge shows spinner when result is missing even if state is result", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/Card.jsx" },
        state: "result",
        result: undefined,
      }}
    />
  );
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
  expect(spinner).not.toBeNull();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "2",
        toolName: "file_manager",
        args: { command: "delete", path: "src/OldComponent.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Deleting OldComponent.jsx")).toBeDefined();
});
