/**
 * Parse gradebook copy-paste from common LMS gradebooks:
 * Brightspace, Canvas, Blackboard, Moodle — plus plain title+points lists.
 */

export type GradebookAcademicType =
  | "Assignment"
  | "Exam"
  | "Quiz"
  | "Lab"
  | "Reading"
  | "Discussion"
  | "Project";

export type GradebookRow = {
  title: string;
  pointsPossible: number;
  pointsEarned?: number;
  academicType: GradebookAcademicType;
};

export type GradebookApplyResult = {
  updates: { id: number; pointsPossible: number; academicType?: GradebookAcademicType; pointsEarned?: number }[];
  creates: GradebookRow[];
  unmatched: GradebookRow[];
};

const SKIP_TITLE =
  /^(grade\s*item|item\s*name|assignment\s*name|name|title|points?(?:\s*possible)?|score|grade|out\s*of|weight|weighted|total|course\s*total|calculated\s*total|comments?|assessments?|feedback|due(?:\s*date)?|status|range|percentage|activity|graded\s*item|category|ungraded)\b/i;

const TOTAL_ROW =
  /^(total|weighted\s*total|course\s*total|final\s*grade|current\s*grade|running\s*total|grand\s*total)\b/i;

function inferAcademicType(title: string): GradebookAcademicType {
  if (/\bdiscussion\b|\bforum\b|\bboard\b/i.test(title)) return "Discussion";
  if (/\bquiz\b|\bcheck[\s-]?in\b/i.test(title)) return "Quiz";
  if (/\bexam\b|midterm\b|test\b/i.test(title)) return "Exam";
  if (/\blab\b/i.test(title)) return "Lab";
  if (/\breading\b/i.test(title)) return "Reading";
  if (/\bfinal\s+submission\b|\bfinal\s+project\b|\bmilestone\b|\bproject\b/i.test(title)) {
    return "Project";
  }
  if (/\bshort\s+paper\b|\bpaper\b|\bessay\b|\bassignment\b|\bhomework\b|\bhw\b/i.test(title)) {
    return "Assignment";
  }
  return "Assignment";
}

export function normalizeGradebookTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\w\s:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitColumns(line: string): string[] {
  const trimmed = line.replace(/\u00a0/g, " ").trim();
  if (!trimmed) return [];
  if (trimmed.includes("\t")) {
    return trimmed.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  }
  // CSV-ish (Canvas exports sometimes)
  if (/,/.test(trimmed) && !/^[^,]+\s+\d+(?:\.\d+)?\s*$/.test(trimmed)) {
    const parts = trimmed.match(/(?:"[^"]*"|[^,]+)/g);
    if (parts && parts.length >= 2) {
      return parts.map((part) => part.replace(/^"|"$/g, "").trim()).filter(Boolean);
    }
  }
  // Blackboard / Moodle often paste with 2+ spaces between cells
  if (/\s{2,}/.test(trimmed)) {
    return trimmed.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  }
  return [trimmed];
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const cleaned = String(raw).replace(/,/g, "").replace(/%/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "—" || /^n\/?a$/i.test(cleaned)) return undefined;
  // Canvas / Moodle score cell: "18/20" or "18 out of 20"
  const ratio = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:\/|out\s*of)\s*(\d+(?:\.\d+)?)$/i);
  if (ratio) {
    const possible = Number(ratio[2]);
    return Number.isFinite(possible) && possible > 0 ? possible : undefined;
  }
  // Moodle range cell: "0–10" / "0-100"
  const range = cleaned.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (range) {
    const possible = Number(range[2]);
    return Number.isFinite(possible) && possible > 0 ? possible : undefined;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function parseEarnedPossible(raw: string | undefined): { earned?: number; possible?: number } {
  if (raw == null) return {};
  const cleaned = String(raw).replace(/,/g, "").trim();
  const ratio = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:\/|out\s*of)\s*(\d+(?:\.\d+)?)$/i);
  if (ratio) {
    const earned = Number(ratio[1]);
    const possible = Number(ratio[2]);
    return {
      earned: Number.isFinite(earned) && earned >= 0 ? earned : undefined,
      possible: Number.isFinite(possible) && possible > 0 ? possible : undefined,
    };
  }
  return {};
}

type ColumnMap = {
  title: number;
  possible?: number;
  score?: number;
  earned?: number;
  range?: number;
};

function detectColumns(headerCells: string[]): ColumnMap | null {
  const lower = headerCells.map((cell) => cell.toLowerCase());
  const find = (...patterns: RegExp[]) =>
    lower.findIndex((cell) => patterns.some((pattern) => pattern.test(cell)));

  const title = find(
    /^grade\s*item$/,
    /^item\s*name$/,
    /^assignment(\s*name)?$/,
    /^activity$/,
    /^graded\s*item$/,
    /^name$/,
    /^title$/,
  );
  if (title < 0) return null;

  const possible = find(
    /^points?\s*possible$/,
    /^out\s*of$/,
    /^max(?:imum)?(?:\s*points?)?$/,
    /^points?$/,
    /^possible$/,
    /^pts$/,
  );
  const score = find(/^score$/, /^grade$/, /^result$/);
  const earned = find(/^points?\s*earned$/, /^earned$/);
  const range = find(/^range$/, /^max\s*grade$/);

  return {
    title,
    possible: possible >= 0 ? possible : undefined,
    score: score >= 0 ? score : undefined,
    earned: earned >= 0 ? earned : undefined,
    range: range >= 0 ? range : undefined,
  };
}

function rowFromCells(cells: string[], columns?: ColumnMap | null): GradebookRow | null {
  if (!cells.length) return null;

  if (columns) {
    const title = cells[columns.title]?.trim();
    if (!title || SKIP_TITLE.test(title) || TOTAL_ROW.test(title)) return null;

    let possible =
      columns.possible != null ? parseNumber(cells[columns.possible]) : undefined;
    let earned =
      columns.earned != null ? parseNumber(cells[columns.earned]) : undefined;

    if (columns.range != null) {
      possible = possible ?? parseNumber(cells[columns.range]);
    }

    if (columns.score != null) {
      const fromScore = parseEarnedPossible(cells[columns.score]);
      if (fromScore.possible != null) possible = possible ?? fromScore.possible;
      if (fromScore.earned != null) earned = earned ?? fromScore.earned;
      // Canvas sometimes puts only earned in Score and possible in Out of
      if (possible == null) {
        const asNum = parseNumber(cells[columns.score]);
        // Don't treat a lone earned score as possible.
        if (asNum != null && columns.possible == null && columns.range == null && asNum > 0 && cells.length === 2) {
          possible = asNum;
        }
      }
    }

    if (possible == null || possible <= 0) return null;
    return {
      title,
      pointsPossible: possible,
      ...(earned != null && earned >= 0 ? { pointsEarned: earned } : {}),
      academicType: inferAcademicType(title),
    };
  }

  // No header map: title in first cell, points in a later numeric cell.
  const title = cells[0]?.trim();
  if (!title || SKIP_TITLE.test(title) || TOTAL_ROW.test(title)) return null;

  for (let index = 1; index < cells.length; index += 1) {
    const ratio = parseEarnedPossible(cells[index]);
    if (ratio.possible != null) {
      return {
        title,
        pointsPossible: ratio.possible,
        ...(ratio.earned != null ? { pointsEarned: ratio.earned } : {}),
        academicType: inferAcademicType(title),
      };
    }
    const points = parseNumber(cells[index]);
    // Prefer the first positive number that looks like "points possible"
    // (skip 0 weights / empty grades).
    if (points != null && points > 0) {
      return {
        title,
        pointsPossible: points,
        academicType: inferAcademicType(title),
      };
    }
  }

  return null;
}

/** Split a pasted line into title + points when there are no clear columns. */
function parseLooseLine(line: string): GradebookRow | null {
  const trimmed = line.replace(/\u00a0/g, " ").trim();
  if (!trimmed || SKIP_TITLE.test(trimmed) || TOTAL_ROW.test(trimmed)) return null;

  // "Title 18/20" or "Title 20"
  const endRatio = trimmed.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:\/|out\s*of)\s*(\d+(?:\.\d+)?)\s*$/i);
  if (endRatio) {
    const title = endRatio[1].trim();
    const possible = Number(endRatio[3]);
    const earned = Number(endRatio[2]);
    if (title && possible > 0) {
      return {
        title,
        pointsPossible: possible,
        pointsEarned: earned >= 0 ? earned : undefined,
        academicType: inferAcademicType(title),
      };
    }
  }

  const endPoints = trimmed.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:pts?|points?)?\s*[-–—]?\s*$/i);
  if (endPoints) {
    const title = endPoints[1].trim();
    const points = Number(endPoints[2]);
    if (title && !SKIP_TITLE.test(title) && points > 0) {
      return { title, pointsPossible: points, academicType: inferAcademicType(title) };
    }
  }

  const labeled = trimmed.match(/^(.*?)\s*[—(]\s*(\d+(?:\.\d+)?)\s*(?:pts?|points?)?\s*\)?\s*$/i);
  if (labeled) {
    const title = labeled[1].trim();
    const points = Number(labeled[2]);
    if (title && points > 0) {
      return { title, pointsPossible: points, academicType: inferAcademicType(title) };
    }
  }

  return null;
}

/** Parse LMS gradebook paste from Brightspace, Canvas, Blackboard, Moodle, or a plain list. */
export function parseGradebookText(text: string): GradebookRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\u00a0/g, " ").trim()).filter(Boolean);
  if (!lines.length) return [];

  const rows: GradebookRow[] = [];
  const seen = new Set<string>();
  let columns: ColumnMap | null = null;
  let started = false;

  for (const line of lines) {
    const cells = splitColumns(line);
    if (!started) {
      const detected = detectColumns(cells);
      if (detected) {
        columns = detected;
        started = true;
        continue;
      }
    }

    const row = rowFromCells(cells, columns) ?? (cells.length === 1 ? parseLooseLine(line) : parseLooseLine(line));
    if (!row) continue;
    const key = normalizeGradebookTitle(row.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
    started = true;
  }

  return rows;
}

function findTaskMatch<T extends { id: number; title: string }>(
  tasks: T[],
  title: string,
  used: Set<number>,
): T | undefined {
  const target = normalizeGradebookTitle(title);
  if (!target) return undefined;

  const exact = tasks.find((task) => !used.has(task.id) && normalizeGradebookTitle(task.title) === target);
  if (exact) return exact;

  const code = target.match(/^(\d+\s*-\s*\d+)/);
  if (code) {
    const prefix = code[1].replace(/\s+/g, "");
    const byCode = tasks.find((task) => {
      if (used.has(task.id)) return false;
      const other = normalizeGradebookTitle(task.title).replace(/\s+/g, "");
      return other.startsWith(prefix);
    });
    if (byCode) return byCode;
  }

  return tasks.find((task) => {
    if (used.has(task.id)) return false;
    const other = normalizeGradebookTitle(task.title);
    return other.includes(target) || target.includes(other);
  });
}

/** Match gradebook rows onto existing class tasks; leftover rows are creates. */
export function planGradebookApply<T extends { id: number; title: string }>(
  tasks: T[],
  rows: GradebookRow[],
): GradebookApplyResult {
  const used = new Set<number>();
  const updates: GradebookApplyResult["updates"] = [];
  const creates: GradebookRow[] = [];

  for (const row of rows) {
    const match = findTaskMatch(tasks, row.title, used);
    if (match) {
      used.add(match.id);
      updates.push({
        id: match.id,
        pointsPossible: row.pointsPossible,
        academicType: row.academicType,
        ...(row.pointsEarned != null ? { pointsEarned: row.pointsEarned } : {}),
      });
    } else {
      creates.push(row);
    }
  }

  return { updates, creates, unmatched: creates };
}

/** Suggest category defaultPoints from imported rows (Discussions → 20, etc.). */
export function suggestCategoryDefaults(rows: GradebookRow[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const row of rows) {
    const key =
      row.academicType === "Discussion"
        ? "discussions"
        : row.academicType === "Project"
          ? "projects"
          : row.academicType === "Quiz"
            ? "quizzes"
            : row.academicType === "Exam"
              ? "exams"
              : row.academicType === "Reading"
                ? "other"
                : "assignments";
    (buckets[key] ??= []).push(row.pointsPossible);
  }
  const out: Record<string, number> = {};
  for (const [key, values] of Object.entries(buckets)) {
    const sorted = [...values].sort((a, b) => a - b);
    out[key] = sorted[Math.floor((sorted.length - 1) / 2)];
  }
  return out;
}
