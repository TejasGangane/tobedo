/**
 * These tests assume a Jest environment with jest.mock
 * support. They focus on the behavior of useTasks.
 */

import { renderHook, act } from "@testing-library/react-hooks";

import { useTasks } from "../features/home/useTasks";
import type { Task } from "../features/home/types";

describe("useTasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default tasks", () => {
    const { result } = renderHook(() => useTasks());

    expect(result.current.tasks.length).toBeGreaterThan(0);
  });

  it("adds a task for a given date", () => {
    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.addTask("Test task", "2025-01-01");
    });

    const found = result.current.tasks.find(
      (t: Task) => t.title === "Test task",
    );
    expect(found).toBeTruthy();
  });

  it("toggles task done state", () => {
    const { result } = renderHook(() => useTasks());
    const id = result.current.tasks[0]?.id;
    expect(id).toBeDefined();

    act(() => {
      result.current.toggleTaskDone(id!);
    });

    const toggled = result.current.tasks.find((t: Task) => t.id === id);
    expect(toggled?.isDone).toBeTruthy();
  });
});

