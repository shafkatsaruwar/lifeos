"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, PieChart, Plus, Trash2 } from "lucide-react";
import {
  computeCourseGrade,
  formatGradePercent,
  letterForPercent,
  normalizeGradeCategories,
  normalizeGradeScale,
  type GradeBand,
  type GradeCategory,
  type ScoreOverride,
} from "../../lib/grades";

export type GradesClass = {
  id: string;
  code: string;
  name: string;
  color: string;
  credits?: number;
  gradingScale?: GradeBand[];
  gradeCategories?: GradeCategory[];
  gradingMode?: "categories" | "items";
};

export type GradesTask = {
  id: number;
  title: string;
  classId?: string;
  academicType?: string;
  gradeCategoryId?: string;
  gradeWeight?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  done?: boolean;
  canceled?: boolean;
};

const formatCourseLabel = (course?: { code?: string; name?: string } | null) => {
  if (!course) return "School";
  const code = (course.code || "").trim();
  const name = (course.name || "").trim();
  if (code && name && code.toLowerCase() !== name.toLowerCase()) return `${code} · ${name}`;
  return code || name || "School";
};

type Props = {
  classes: GradesClass[];
  tasks: GradesTask[];
  onBack: () => void;
  onOpenTask: (id: number) => void;
  onUpdateClass: (id: string, updates: Partial<Pick<GradesClass, "gradingScale" | "gradeCategories" | "gradingMode">>) => void;
  onUpdateTask: (id: number, updates: Partial<Pick<GradesTask, "pointsEarned" | "pointsPossible" | "gradeWeight" | "gradeCategoryId">>) => void;
  onNewAcademic?: () => void;
};

export function SchoolGradesPanel({ classes, tasks, onBack, onOpenTask, onUpdateClass, onUpdateTask, onNewAcademic }: Props) {
  const activeClasses = classes.filter((course) => true);
  const [selectedId, setSelectedId] = useState(() => activeClasses[0]?.id ?? "");
  const selected = activeClasses.find((course) => course.id === selectedId) ?? activeClasses[0];
  const [overrides, setOverrides] = useState<Record<string, ScoreOverride>>({});
  const [editingScheme, setEditingScheme] = useState(false);
  const [targetLetter, setTargetLetter] = useState("A-");

  const courseTasks = useMemo(
    () => tasks.filter((task) => task.classId === selected?.id && !task.canceled),
    [tasks, selected?.id],
  );

  const scale = normalizeGradeScale(selected?.gradingScale);
  const categories = normalizeGradeCategories(selected?.gradeCategories);
  const mode = selected?.gradingMode === "items" ? "items" : "categories";

  const result = useMemo(
    () =>
      selected
        ? computeCourseGrade(courseTasks, { scale, categories, mode, overrides })
        : null,
    [selected, courseTasks, scale, categories, mode, overrides],
  );

  const setOverride = (taskId: number, patch: ScoreOverride) => {
    const key = String(taskId);
    setOverrides((current) => {
      const next = { ...current, [key]: { ...current[key], ...patch } };
      if (next[key].pointsEarned == null && next[key].pointsPossible == null) {
        const { [key]: _, ...rest } = next;
        return rest;
      }
      return next;
    });
  };

  const persistScore = (task: GradesTask) => {
    const key = String(task.id);
    const override = overrides[key];
    if (!override) return;
    const possible = override.pointsPossible ?? task.pointsPossible ?? 100;
    const earned = override.pointsEarned;
    if (earned == null || !Number.isFinite(earned)) return;
    onUpdateTask(task.id, { pointsPossible: possible, pointsEarned: Math.max(0, Math.min(possible, earned)) });
    setOverrides((current) => {
      const { [key]: _, ...rest } = current;
      return rest;
    });
  };

  const clearWhatIf = () => setOverrides({});

  const needed = result?.neededOnRemaining.find((row) => row.letter === targetLetter);

  if (!selected) {
    return (
      <div className="school-tab-panel" data-testid="school-grades">
        <button type="button" className="school-link-btn" onClick={onBack} style={{ marginBottom: 8 }}>
          <ChevronLeft size={14} /> Home
        </button>
        <div className="school-empty-inline">
          <p>Add a class first — grades follow each course&apos;s scale and scheme.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="school-tab-panel school-grades" data-testid="school-grades">
      <button type="button" className="school-link-btn" onClick={onBack} style={{ marginBottom: 8 }}>
        <ChevronLeft size={14} /> More
      </button>

      <div className="school-grades-hero">
        <div>
          <p className="eyebrow">Grades & what-if</p>
          <h2>Course standing</h2>
          <p>Uses each class&apos;s letter scale, grading scheme, and how much every assignment is worth.</p>
        </div>
        <div className="school-grades-score" style={{ borderColor: selected.color }}>
          <strong>{result?.letter ?? "—"}</strong>
          <span>{formatGradePercent(result?.percent)}</span>
        </div>
      </div>

      <div className="school-grades-course-tabs" role="tablist" aria-label="Classes">
        {activeClasses.map((course) => (
          <button
            key={course.id}
            type="button"
            role="tab"
            aria-selected={course.id === selected.id}
            className={course.id === selected.id ? "selected" : ""}
            onClick={() => { setSelectedId(course.id); setOverrides({}); setEditingScheme(false); }}
          >
            <i style={{ background: course.color }} />
            {course.code}
          </button>
        ))}
      </div>

      <div className="school-card school-grades-summary">
        <div>
          <small>Class</small>
          <strong>{formatCourseLabel(selected)}</strong>
        </div>
        <div>
          <small>Mode</small>
          <strong>{mode === "items" ? "Item weights" : "Category scheme"}</strong>
        </div>
        <div>
          <small>Logged</small>
          <strong>
            {result ? `${result.gradedWeight.toFixed(0)}% / ${result.totalWeight.toFixed(0)}%` : "—"}
          </strong>
        </div>
        {selected.credits != null && (
          <div>
            <small>Credits</small>
            <strong>{selected.credits}</strong>
          </div>
        )}
      </div>

      <div className="school-grades-toolbar">
        <div className="calendar-mode-tabs" role="group" aria-label="Grading mode">
          <button
            type="button"
            className={mode === "categories" ? "selected" : ""}
            onClick={() => onUpdateClass(selected.id, { gradingMode: "categories" })}
          >
            Categories
          </button>
          <button
            type="button"
            className={mode === "items" ? "selected" : ""}
            onClick={() => onUpdateClass(selected.id, { gradingMode: "items" })}
          >
            Item weights
          </button>
        </div>
        <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={() => setEditingScheme((value) => !value)}>
          {editingScheme ? "Done editing" : "Edit scale & scheme"}
        </button>
        {Object.keys(overrides).length > 0 && (
          <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={clearWhatIf}>
            Clear what-if
          </button>
        )}
      </div>

      {editingScheme && (
        <div className="school-card school-grades-scheme" data-testid="school-grades-scheme">
          <div className="school-grades-scheme-head">
            <strong>Letter scale</strong>
            <button
              type="button"
              className="school-btn school-btn-ghost school-btn-sm"
              onClick={() => onUpdateClass(selected.id, { gradingScale: normalizeGradeScale(undefined) })}
            >
              Reset scale
            </button>
          </div>
          <div className="school-grades-scale-grid">
            {scale.map((band, index) => (
              <label key={`${band.letter}-${index}`}>
                <span>{band.letter}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={band.min}
                  onChange={(event) => {
                    const next = scale.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, min: Number(event.target.value) || 0 } : row,
                    );
                    onUpdateClass(selected.id, { gradingScale: normalizeGradeScale(next) });
                  }}
                />
              </label>
            ))}
          </div>

          {mode === "categories" && (
            <>
              <div className="school-grades-scheme-head" style={{ marginTop: 16 }}>
                <strong>Scheme (category weights)</strong>
                <button
                  type="button"
                  className="school-btn school-btn-ghost school-btn-sm"
                  onClick={() => {
                    const id = `cat-${Date.now().toString(36)}`;
                    onUpdateClass(selected.id, {
                      gradeCategories: [...categories, { id, name: "New category", weight: 5 }],
                    });
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="school-grades-cat-editor">
                {categories.map((cat) => (
                  <div key={cat.id} className="school-grades-cat-row">
                    <input
                      aria-label="Category name"
                      value={cat.name}
                      onChange={(event) => {
                        onUpdateClass(selected.id, {
                          gradeCategories: categories.map((row) =>
                            row.id === cat.id ? { ...row, name: event.target.value } : row,
                          ),
                        });
                      }}
                    />
                    <label>
                      <span>%</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={cat.weight}
                        onChange={(event) => {
                          onUpdateClass(selected.id, {
                            gradeCategories: categories.map((row) =>
                              row.id === cat.id ? { ...row, weight: Number(event.target.value) || 0 } : row,
                            ),
                          });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${cat.name}`}
                      onClick={() =>
                        onUpdateClass(selected.id, {
                          gradeCategories: categories.filter((row) => row.id !== cat.id),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <p className="school-grades-hint">
                  Weights total {categories.reduce((sum, cat) => sum + cat.weight, 0).toFixed(0)}%. Assignments map by type unless you set a category on the task.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {result && result.remainingWeight > 0 && (
        <div className="school-card school-grades-whatif" data-testid="school-grades-whatif">
          <div className="school-grades-scheme-head">
            <strong>What-if</strong>
            <label className="school-grades-target">
              Target
              <select value={targetLetter} onChange={(event) => setTargetLetter(event.target.value)}>
                {scale.filter((band) => band.letter !== "F").map((band) => (
                  <option key={band.letter} value={band.letter}>{band.letter}</option>
                ))}
              </select>
            </label>
          </div>
          <p>
            {needed?.needPercent == null
              ? `${targetLetter} needs a higher average than 100% on the remaining ${result.remainingWeight.toFixed(0)}% — not reachable on open work alone.`
              : `Average ${needed.needPercent.toFixed(1)}% on the remaining ${result.remainingWeight.toFixed(0)}% of the course to land a ${targetLetter}.`}
          </p>
          <p className="school-grades-hint">Type trial scores below — they stay local until you save them onto the assignment.</p>
        </div>
      )}

      {mode === "categories" && result && (
        <div className="school-card" style={{ padding: "10px 0" }}>
          {result.categories.map((cat) => (
            <div key={cat.id} className="school-grades-cat-summary">
              <div>
                <strong>{cat.name}</strong>
                <small>{cat.weight}% of course · {cat.gradedCount} graded · {cat.openCount} open</small>
              </div>
              <span>{formatGradePercent(cat.average)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="school-card" style={{ paddingTop: 4, paddingBottom: 4 }} data-testid="school-grades-items">
        {courseTasks.length ? (
          courseTasks.map((task) => {
            const line = result?.items.find((item) => item.id === task.id);
            const key = String(task.id);
            const override = overrides[key];
            const possible = override?.pointsPossible ?? task.pointsPossible ?? "";
            const earned = override?.pointsEarned ?? task.pointsEarned ?? "";
            return (
              <div key={task.id} className="school-grades-item">
                <button type="button" className="school-grades-item-main" onClick={() => onOpenTask(task.id)}>
                  <span className="school-dot" style={{ background: selected.color }} />
                  <span className="school-row-body">
                    <p className="school-row-title">{task.title}</p>
                    <p className="school-row-meta">
                      {task.academicType ?? "Task"}
                      {line ? ` · ${line.categoryName}` : ""}
                      {mode === "items" && task.gradeWeight != null ? ` · ${task.gradeWeight}% of course` : ""}
                      {line?.percent != null ? ` · ${formatGradePercent(line.percent)}` : " · not scored"}
                      {line?.isWhatIf ? " · what-if" : ""}
                    </p>
                  </span>
                  <strong>{line?.percent != null ? letterForPercent(line.percent, scale) : "—"}</strong>
                </button>
                <div className="school-grades-item-score">
                  {mode === "categories" && (
                    <select
                      aria-label={`Category for ${task.title}`}
                      value={task.gradeCategoryId ?? line?.categoryId ?? categories[0]?.id}
                      onChange={(event) => onUpdateTask(task.id, { gradeCategoryId: event.target.value })}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                  {mode === "items" && (
                    <label>
                      Wt%
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={task.gradeWeight ?? ""}
                        placeholder="0"
                        onChange={(event) =>
                          onUpdateTask(task.id, {
                            gradeWeight: event.target.value === "" ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    Earned
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={earned}
                      placeholder="—"
                      onChange={(event) =>
                        setOverride(task.id, {
                          pointsEarned: event.target.value === "" ? undefined : Number(event.target.value),
                          pointsPossible:
                            override?.pointsPossible ??
                            task.pointsPossible ??
                            (event.target.value === "" ? undefined : 100),
                        })
                      }
                    />
                  </label>
                  <label>
                    Possible
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={possible}
                      placeholder="100"
                      onChange={(event) =>
                        setOverride(task.id, {
                          pointsPossible: event.target.value === "" ? undefined : Number(event.target.value),
                          pointsEarned: override?.pointsEarned ?? task.pointsEarned,
                        })
                      }
                    />
                  </label>
                  {overrides[key] && (
                    <button type="button" className="school-btn school-btn-primary school-btn-sm" onClick={() => persistScore(task)}>
                      Save score
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="school-empty-inline">
            <p>No coursework linked to this class yet.</p>
            {onNewAcademic && (
              <button type="button" className="school-btn school-btn-primary school-btn-sm" onClick={onNewAcademic}>
                <PieChart size={14} /> Add assignment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
