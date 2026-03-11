import { buildMonthGrid, buildMonthStrip, formatDateKey, parseDateKey } from "../features/home/dateUtils";

describe("dateUtils", () => {
  it("formats and parses date keys consistently", () => {
    const now = new Date(2025, 0, 15); // Jan 15 2025
    const key = formatDateKey(now);
    const parsed = parseDateKey(key);

    expect(key).toBe("2025-01-15");
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(15);
  });

  it("builds a month strip for the given month", () => {
    const anchor = new Date(2025, 1, 10); // Feb 2025
    const days = buildMonthStrip(anchor);

    expect(days.length).toBeGreaterThanOrEqual(28);
    expect(days[0]).toHaveProperty("key");
    expect(days[0]).toHaveProperty("label");
    expect(days[0]).toHaveProperty("dayNumber");
  });

  it("builds a month grid with full weeks", () => {
    const month = new Date(2025, 1, 1); // Feb 2025
    const weeks = buildMonthGrid(month);

    expect(weeks.length).toBeGreaterThan(3);
    weeks.forEach((week) => {
      expect(week).toHaveLength(7);
    });
  });
});

