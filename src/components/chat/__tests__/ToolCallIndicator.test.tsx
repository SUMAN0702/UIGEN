import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallIndicator } from "../ToolCallIndicator";

afterEach(() => {
  cleanup();
});

test("shows 'Created' label for str_replace_editor create command", () => {
  render(
    <ToolCallIndicator
      toolName="str_replace_editor"
      args={{ command: "create", path: "/Card.jsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Created Card.jsx")).toBeDefined();
});

test("shows 'Edited' label for str_replace_editor str_replace command", () => {
  render(
    <ToolCallIndicator
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/components/Button.tsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Edited Button.tsx")).toBeDefined();
});

test("shows 'Inserted into' label for str_replace_editor insert command", () => {
  render(
    <ToolCallIndicator
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/App.jsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Inserted into App.jsx")).toBeDefined();
});

test("shows 'Viewing' label for str_replace_editor view command", () => {
  render(
    <ToolCallIndicator
      toolName="str_replace_editor"
      args={{ command: "view", path: "/index.tsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Viewing index.tsx")).toBeDefined();
});

test("shows 'Renamed' label with old and new file names for file_manager rename", () => {
  render(
    <ToolCallIndicator
      toolName="file_manager"
      args={{ command: "rename", path: "/old.jsx", new_path: "/new.jsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Renamed old.jsx → new.jsx")).toBeDefined();
});

test("shows 'Deleted' label for file_manager delete command", () => {
  render(
    <ToolCallIndicator
      toolName="file_manager"
      args={{ command: "delete", path: "/unused.jsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Deleted unused.jsx")).toBeDefined();
});

test("shows spinner when tool is still running", () => {
  render(
    <ToolCallIndicator
      toolName="str_replace_editor"
      args={{ command: "create", path: "/Card.jsx" }}
      state="call"
      hasResult={false}
    />
  );
  expect(screen.getByText("Created Card.jsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});

test("shows green dot when tool is completed", () => {
  render(
    <ToolCallIndicator
      toolName="str_replace_editor"
      args={{ command: "create", path: "/Card.jsx" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("Created Card.jsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeNull();
  const dot = document.querySelector(".bg-emerald-500");
  expect(dot).not.toBeNull();
});

test("falls back to raw tool name for unknown tools", () => {
  render(
    <ToolCallIndicator
      toolName="unknown_tool"
      args={{ command: "do_something", path: "/file.txt" }}
      state="result"
      hasResult={true}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});
