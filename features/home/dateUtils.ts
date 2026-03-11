export const formatDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const buildMonthStrip = (anchor: Date) => {
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const days: { key: string; label: string; dayNumber: number }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const key = formatDateKey(d);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    days.push({ key, label, dayNumber: d.getDate() });
  }

  return days;
};

export const buildMonthGrid = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const firstWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const weeks: { key: string; dayNumber: number }[][] = [];
  let currentWeek: { key: string; dayNumber: number }[] = [];

  // leading blanks
  for (let i = 0; i < firstWeekday; i++) {
    currentWeek.push({ key: `blank-${i}`, dayNumber: 0 });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    currentWeek.push({ key: formatDateKey(date), dayNumber: day });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length) {
    while (currentWeek.length < 7) {
      const idx = currentWeek.length;
      currentWeek.push({ key: `blank-tail-${idx}`, dayNumber: 0 });
    }
    weeks.push(currentWeek);
  }

  return weeks;
};

