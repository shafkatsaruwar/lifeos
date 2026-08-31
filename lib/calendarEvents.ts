import { toDateKey } from "./helpers";

export type CalendarEventRange = {
  start: string;
  end?: string;
  weekdaysOnly?: boolean;
};

export function getEventDateRange(event: CalendarEventRange) {
  const startKey = event.start.slice(0, 10);
  const candidateEnd = event.end?.slice(0, 10) ?? startKey;
  return { startKey, endKey: candidateEnd < startKey ? startKey : candidateEnd };
}

export function isWeekendDateKey(dateKey: string): boolean {
  const day = new Date(`${dateKey}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

export function eventOccursOnDate(event: CalendarEventRange, dateKey: string): boolean {
  const { startKey, endKey } = getEventDateRange(event);
  if (dateKey < startKey || dateKey > endKey) return false;
  if (event.weekdaysOnly && isWeekendDateKey(dateKey)) return false;
  return true;
}

export type MonthEventSegment<T extends CalendarEventRange = CalendarEventRange> = {
  event: T;
  week: number;
  startColumn: number;
  endColumn: number;
  lane: number;
  startsEvent: boolean;
  endsEvent: boolean;
};

export function buildMonthEventSegments<T extends CalendarEventRange>(
  events: T[],
  days: Date[],
): MonthEventSegment<T>[] {
  const keys = days.map(toDateKey);
  if (!keys.length) return [];
  const drafts: Omit<MonthEventSegment<T>, "lane">[] = [];

  events.forEach((event) => {
    const range = getEventDateRange(event);
    if (range.endKey < keys[0] || range.startKey > keys[keys.length - 1]) return;

    if (event.weekdaysOnly) {
      let index = 0;
      while (index < keys.length) {
        const key = keys[index];
        if (key < range.startKey || key > range.endKey || isWeekendDateKey(key)) {
          index += 1;
          continue;
        }
        const week = Math.floor(index / 7);
        let endIndex = index;
        while (endIndex + 1 < keys.length) {
          const nextIndex = endIndex + 1;
          if (Math.floor(nextIndex / 7) !== week) break;
          const nextKey = keys[nextIndex];
          if (nextKey > range.endKey) break;
          if (isWeekendDateKey(nextKey)) break;
          endIndex = nextIndex;
        }
        drafts.push({
          event,
          week,
          startColumn: (index % 7) + 1,
          endColumn: (endIndex % 7) + 1,
          startsEvent: key === range.startKey,
          endsEvent: keys[endIndex] === range.endKey,
        });
        index = endIndex + 1;
      }
      return;
    }

    const clippedStart = range.startKey < keys[0] ? keys[0] : range.startKey;
    const clippedEnd = range.endKey > keys[keys.length - 1] ? keys[keys.length - 1] : range.endKey;
    let cursor = keys.indexOf(clippedStart);
    const finalIndex = keys.indexOf(clippedEnd);
    while (cursor >= 0 && cursor <= finalIndex) {
      const week = Math.floor(cursor / 7);
      const segmentEnd = Math.min(finalIndex, week * 7 + 6);
      drafts.push({
        event,
        week,
        startColumn: (cursor % 7) + 1,
        endColumn: (segmentEnd % 7) + 1,
        startsEvent: keys[cursor] === range.startKey,
        endsEvent: keys[segmentEnd] === range.endKey,
      });
      cursor = segmentEnd + 1;
    }
  });

  drafts.sort((a, b) => a.week - b.week || a.startColumn - b.startColumn || b.endColumn - a.endColumn);
  const occupied = new Map<number, Array<{ lane: number; start: number; end: number }>>();
  return drafts.map((segment) => {
    const weekItems = occupied.get(segment.week) ?? [];
    let lane = 0;
    while (weekItems.some((item) => item.lane === lane && item.start <= segment.endColumn && item.end >= segment.startColumn)) {
      lane += 1;
    }
    weekItems.push({ lane, start: segment.startColumn, end: segment.endColumn });
    occupied.set(segment.week, weekItems);
    return { ...segment, lane };
  });
}
