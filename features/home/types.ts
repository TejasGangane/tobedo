export type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isDone: boolean;
};

export type PomodoroState =
  | { mode: "idle" }
  | {
      mode: "ready" | "focus";
      taskId: string;
      remainingSeconds: number;
      totalSeconds: number;
      /**
       * When in focus mode, we track wall-clock time so the timer
       * continues correctly across app backgrounding.
       */
      startedAtMs?: number;
      remainingAtStartSeconds?: number;
    }
  | {
      mode: "completed";
      taskId: string;
    };

