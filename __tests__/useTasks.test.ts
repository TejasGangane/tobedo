/**
 * These tests assume a Jest environment with jest.mock
 * support. They focus on the behavior of useTasks.
 */

import { renderHook, act } from "@testing-library/react-hooks";

import { useTasks } from "../features/home/useTasks";

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

    expect(
      result.current.tasks.find((t) => t.title === "Test task"),
    ).toBeTruthy();
  });

  it("toggles task done state", () => {
    const { result } = renderHook(() => useTasks());
    const id = result.current.tasks[0]?.id;
    expect(id).toBeDefined();

    act(() => {
      result.current.toggleTaskDone(id!);
    });

    expect(
      result.current.tasks.find((t) => t.id === id)?.isDone,
    ).toBeTruthy();
  });
});

