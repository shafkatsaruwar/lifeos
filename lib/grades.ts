/** SchoolOS course grades: letter scale, category scheme, weighted items, what-if. */

export type GradeBand = { letter: string; min: number };

export type GradeCategory = {
  id: string;
  name: string;
  /** Percent of the course grade (categories should sum to ~100). */
  weight: number;
};

export type GradableItem = {
  id: string | number;
  title: string;
  academicType?: string;
  gradeCategoryId?: string;
  /** Percent of course when the class uses flat item weights (no categories). */
  gradeWeight?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  done?: boolean;
  canceled?: boolean;
};

export type ScoreOverride = {
  pointsEarned?: number;
  pointsPossible?: number;
};

export const DEFAULT_LETTER_SCALE: GradeBand[] = [
  { letter: "A", min: 93 },
  { letter: "A-", min: 90 },
  { letter: "B+", min: 87 },
  { letter: "B", min: 83 },
  { letter: "B-", min: 80 },
  { letter: "C+", min: 77 },
  { letter: "C", min: 73 },
  { letter: "C-", min: 70 },
  { letter: "D+", min: 67 },
  { letter: "D", min: 63 },
  { letter: "D-", min: 60 },
  { letter: "F", min: 0 },
];

/** Default syllabus-style scheme — editable per class. */
export const DEFAULT_GRADE_CATEGORIES: GradeCategory[] = [
  { id: "assignments", name: "Assignments", weight: 35 },
  { id: "projects", name: "Projects", weight: 15 },
  { id: "quizzes", name: "Quizzes", weight: 15 },
  { id: "exams", name: "Exams", weight: 30 },
  { id: "other", name: "Other", weight: 5 },
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  Assignment: "assignments",
  Lab: "assignments",
  Discussion: "assignments",
  Reading: "other",
  Project: "projects",
  Quiz: "quizzes",
  Exam: "exams",
};

export function normalizeGradeScale(scale?: GradeBand[] | null): GradeBand[] {
  const cleaned = (scale ?? [])
    .filter((band) => band && typeof band.letter === "string" && Number.isFinite(band.min))
    .map((band) => ({ letter: band.letter.trim() || "?", min: Math.max(0, Math.min(100, Number(band.min))) }))
    .sort((a, b) => b.min - a.min);
  return cleaned.length ? cleaned : DEFAULT_LETTER_SCALE.map((band) => ({ ...band }));
}

export function normalizeGradeCategories(categories?: GradeCategory[] | null): GradeCategory[] {
  const cleaned = (categories ?? [])
    .filter((cat) => cat && typeof cat.id === "string" && typeof cat.name === "string" && Number.isFinite(cat.weight))
    .map((cat) => ({
      id: cat.id.trim() || `cat-${Math.random().toString(36).slice(2, 8)}`,
      name: cat.name.trim() || "Category",
      weight: Math.max(0, Math.min(100, Number(cat.weight))),
    }))
    .filter((cat) => cat.weight > 0);
  return cleaned.length ? cleaned : DEFAULT_GRADE_CATEGORIES.map((cat) => ({ ...cat }));
}

export function categoryIdForItem(
  item: Pick<GradableItem, "gradeCategoryId" | "academicType">,
  categories: GradeCategory[],
): string {
  if (item.gradeCategoryId && categories.some((cat) => cat.id === item.gradeCategoryId)) {
    return item.gradeCategoryId;
  }
  const mapped = item.academicType ? TYPE_TO_CATEGORY[item.academicType] : undefined;
  if (mapped && categories.some((cat) => cat.id === mapped)) return mapped;
  return categories[categories.length - 1]?.id ?? "other";
}

export function letterForPercent(percent: number | null | undefined, scale?: GradeBand[] | null): string | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  const bands = normalizeGradeScale(scale);
  const clamped = Math.max(0, Math.min(100, percent));
  for (const band of bands) {
    if (clamped >= band.min) return band.letter;
  }
  return bands[bands.length - 1]?.letter ?? "F";
}

export function itemScorePercent(
  item: Pick<GradableItem, "pointsEarned" | "pointsPossible">,
  override?: ScoreOverride,
): number | null {
  const earned = override?.pointsEarned ?? item.pointsEarned;
  const possible = override?.pointsPossible ?? item.pointsPossible;
  if (typeof earned !== "number" || typeof possible !== "number" || possible <= 0) return null;
  if (!Number.isFinite(earned) || !Number.isFinite(possible)) return null;
  return Math.max(0, Math.min(100, (earned / possible) * 100));
}

function averagePercents(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export type GradedLine = {
  id: string | number;
  title: string;
  academicType?: string;
  categoryId: string;
  categoryName: string;
  gradeWeight?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  percent: number | null;
  isWhatIf: boolean;
  isGraded: boolean;
};

export type CategoryBreakdown = {
  id: string;
  name: string;
  weight: number;
  average: number | null;
  contribution: number | null;
  gradedCount: number;
  openCount: number;
  items: GradedLine[];
};

export type CourseGradeResult = {
  percent: number | null;
  letter: string | null;
  mode: "categories" | "items";
  gradedWeight: number;
  totalWeight: number;
  remainingWeight: number;
  categories: CategoryBreakdown[];
  items: GradedLine[];
  /** Average still needed on remaining weight to hit each letter band. */
  neededOnRemaining: { letter: string; needPercent: number | null }[];
};

function computeNeededOnRemaining(
  currentWeightedSum: number,
  gradedWeight: number,
  remainingWeight: number,
  scale: GradeBand[],
): { letter: string; needPercent: number | null }[] {
  if (remainingWeight <= 0) {
    return scale.map((band) => ({ letter: band.letter, needPercent: null }));
  }
  const total = gradedWeight + remainingWeight;
  return scale
    .filter((band) => band.letter !== "F")
    .map((band) => {
      const target = band.min * total;
      const need = (target - currentWeightedSum) / remainingWeight;
      if (!Number.isFinite(need)) return { letter: band.letter, needPercent: null };
      if (need > 100) return { letter: band.letter, needPercent: null };
      return { letter: band.letter, needPercent: Math.max(0, Math.min(100, need)) };
    });
}

/**
 * Course average + letter.
 * - `mode: "items"` — each task's `gradeWeight` is % of the course.
 * - `mode: "categories"` (default) — syllabus scheme; items map via `gradeCategoryId` or academic type.
 */
export function computeCourseGrade(
  items: GradableItem[],
  options: {
    scale?: GradeBand[] | null;
    categories?: GradeCategory[] | null;
    mode?: "categories" | "items";
    overrides?: Record<string, ScoreOverride>;
  } = {},
): CourseGradeResult {
  const scale = normalizeGradeScale(options.scale);
  const overrides = options.overrides ?? {};
  const active = items.filter((item) => !item.canceled);
  const mode = options.mode ?? "categories";

  if (mode === "items") {
    return computeItemWeighted(active, scale, overrides);
  }

  const categories = normalizeGradeCategories(options.categories);
  return computeCategoryWeighted(active, scale, categories, overrides);
}

function computeItemWeighted(
  items: GradableItem[],
  scale: GradeBand[],
  overrides: Record<string, ScoreOverride>,
): CourseGradeResult {
  const lines: GradedLine[] = items.map((item) => {
    const key = String(item.id);
    const override = overrides[key];
    const percent = itemScorePercent(item, override);
    const isWhatIf = Boolean(override && (override.pointsEarned != null || override.pointsPossible != null) && item.pointsEarned == null);
    return {
      id: item.id,
      title: item.title,
      academicType: item.academicType,
      categoryId: "course",
      categoryName: "Course",
      gradeWeight: item.gradeWeight,
      pointsEarned: override?.pointsEarned ?? item.pointsEarned,
      pointsPossible: override?.pointsPossible ?? item.pointsPossible,
      percent,
      isWhatIf,
      isGraded: percent != null,
    };
  });

  const weighted = lines.filter((line) => (line.gradeWeight ?? 0) > 0);
  const graded = weighted.filter((line) => line.percent != null);
  const gradedWeight = graded.reduce((sum, line) => sum + (line.gradeWeight ?? 0), 0);
  const totalWeight = weighted.reduce((sum, line) => sum + (line.gradeWeight ?? 0), 0);
  const remainingWeight = Math.max(0, totalWeight - gradedWeight);
  const weightedSum = graded.reduce((sum, line) => sum + (line.percent as number) * (line.gradeWeight as number), 0);
  const percent = gradedWeight > 0 ? weightedSum / gradedWeight : null;

  return {
    percent,
    letter: letterForPercent(percent, scale),
    mode: "items",
    gradedWeight,
    totalWeight,
    remainingWeight,
    categories: [
      {
        id: "course",
        name: "Course weight",
        weight: totalWeight || 100,
        average: percent,
        contribution: percent,
        gradedCount: graded.length,
        openCount: weighted.length - graded.length,
        items: lines,
      },
    ],
    items: lines,
    neededOnRemaining: computeNeededOnRemaining(weightedSum, gradedWeight, remainingWeight, scale),
  };
}

function computeCategoryWeighted(
  items: GradableItem[],
  scale: GradeBand[],
  categories: GradeCategory[],
  overrides: Record<string, ScoreOverride>,
): CourseGradeResult {
  const lines: GradedLine[] = items.map((item) => {
    const key = String(item.id);
    const override = overrides[key];
    const categoryId = categoryIdForItem(item, categories);
    const category = categories.find((cat) => cat.id === categoryId)!;
    const percent = itemScorePercent(item, override);
    const hadScore = typeof item.pointsEarned === "number" && typeof item.pointsPossible === "number";
    const isWhatIf = Boolean(override && percent != null && !hadScore);
    return {
      id: item.id,
      title: item.title,
      academicType: item.academicType,
      categoryId,
      categoryName: category.name,
      gradeWeight: item.gradeWeight,
      pointsEarned: override?.pointsEarned ?? item.pointsEarned,
      pointsPossible: override?.pointsPossible ?? item.pointsPossible,
      percent,
      isWhatIf,
      isGraded: percent != null,
    };
  });

  const breakdown: CategoryBreakdown[] = categories.map((cat) => {
    const catItems = lines.filter((line) => line.categoryId === cat.id);
    const scored = catItems.filter((line) => line.percent != null);
    // Prefer points-weighted average inside the category when possible.
    let average: number | null = null;
    if (scored.length) {
      const withPoints = scored.filter(
        (line) => typeof line.pointsPossible === "number" && line.pointsPossible > 0 && typeof line.pointsEarned === "number",
      );
      if (withPoints.length === scored.length) {
        const earned = withPoints.reduce((sum, line) => sum + (line.pointsEarned as number), 0);
        const possible = withPoints.reduce((sum, line) => sum + (line.pointsPossible as number), 0);
        average = possible > 0 ? (earned / possible) * 100 : null;
      } else if (scored.some((line) => (line.gradeWeight ?? 0) > 0)) {
        const weightSum = scored.reduce((sum, line) => sum + (line.gradeWeight ?? 0), 0);
        average =
          weightSum > 0
            ? scored.reduce((sum, line) => sum + (line.percent as number) * (line.gradeWeight ?? 0), 0) / weightSum
            : averagePercents(scored.map((line) => line.percent as number));
      } else {
        average = averagePercents(scored.map((line) => line.percent as number));
      }
    }
    return {
      id: cat.id,
      name: cat.name,
      weight: cat.weight,
      average,
      contribution: average != null ? (average * cat.weight) / 100 : null,
      gradedCount: scored.length,
      openCount: catItems.length - scored.length,
      items: catItems,
    };
  });

  const activeCats = breakdown.filter((cat) => cat.average != null);
  const gradedWeight = activeCats.reduce((sum, cat) => sum + cat.weight, 0);
  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
  const remainingWeight = Math.max(0, totalWeight - gradedWeight);
  const weightedSum = activeCats.reduce((sum, cat) => sum + (cat.average as number) * cat.weight, 0);
  const percent = gradedWeight > 0 ? weightedSum / gradedWeight : null;

  return {
    percent,
    letter: letterForPercent(percent, scale),
    mode: "categories",
    gradedWeight,
    totalWeight,
    remainingWeight,
    categories: breakdown,
    items: lines,
    neededOnRemaining: computeNeededOnRemaining(weightedSum, gradedWeight, remainingWeight, scale),
  };
}

export function formatGradePercent(percent: number | null | undefined, digits = 1): string {
  if (percent == null || !Number.isFinite(percent)) return "—";
  return `${percent.toFixed(digits)}%`;
}
