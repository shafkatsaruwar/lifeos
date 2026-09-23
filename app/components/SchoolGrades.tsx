"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, PieChart, Plus, Trash2, Upload } from "lucide-react";
import {
  computeCourseGrade,
  formatGradePercent,
  letterForPercent,
  normalizeGradeCategories,
  normalizeGradeScale,
  resolvePointsPossible,
  type GradeBand,
  type GradeCategory,
  type ScoreOverride,
} from "../../lib/grades";
import {
  parseGradebookText,
  planGradebookApply,
  suggestCategoryDefaults,
  type GradebookRow,
} from "../../lib/gradebookImport";

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

export type GradebookCreateItem = {
  title: string;
  academicType: string;
  pointsPossible: number;
  pointsEarned?: number;
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
  onUpdateTask: (id: number, updates: Partial<Pick<GradesTask, "pointsEarned" | "pointsPossible" | "gradeWeight" | "gradeCategoryId" | "academicType">>) => void;
  onCreateGradeItems?: (classId: string, items: GradebookCreateItem[]) => void;
  onNewAcademic?: () => void;
};

export function SchoolGradesPanel({
  classes,
  tasks,
  onBack,
  onOpenTask,
  onUpdateClass,
  onUpdateTask,
  onCreateGradeItems,
  onNewAcademic,
}: Props) {
  const activeClasses = classes.filter((course) => true);
  const [selectedId, setSelectedId] = useState(() => activeClasses[0]?.id ?? "");
  const selected = activeClasses.find((course) => course.id === selectedId) ?? activeClasses[0];
  const [overrides, setOverrides] = useState<Record<string, ScoreOverride>>({});
  const [editingScheme, setEditingScheme] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualPoints, setManualPoints] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [targetLetter, setTargetLetter] = useState("A-");

  const courseTasks = useMemo(
    () => tasks.filter((task) => task.classId === selected?.id && !task.canceled),
    [tasks, selected?.id],
  );

  const scale = normalizeGradeScale(selected?.gradingScale);
  const categories = normalizeGradeCategories(selected?.gradeCategories);
  const mode = selected?.gradingMode === "items" ? "items" : "categories";
  const importPreview = useMemo(() => parseGradebookText(importText), [importText]);

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

  /** Points-possible belong on the assignment immediately (survive reload). Trial earned scores stay local. */
  const persistPossible = (task: GradesTask, raw: string) => {
    const key = String(task.id);
    const pointsPossible =
      raw === "" ? undefined : Math.max(0, Number(raw) || 0) || undefined;
    onUpdateTask(task.id, { pointsPossible });
    setOverrides((current) => {
      const prev = current[key];
      if (!prev) return current;
      if (prev.pointsEarned == null) {
        const { [key]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: { pointsEarned: prev.pointsEarned } };
    });
  };

  const persistScore = (task: GradesTask) => {
    const key = String(task.id);
    const override = overrides[key];
    if (!override) return;
    const possible =
      resolvePointsPossible(task, categories, override.pointsPossible) ??
      task.pointsPossible ??
      100;
    const updates: Partial<Pick<GradesTask, "pointsEarned" | "pointsPossible">> = {
      pointsPossible: possible,
    };
    if (typeof override.pointsEarned === "number" && Number.isFinite(override.pointsEarned)) {
      updates.pointsEarned = Math.max(0, Math.min(possible, override.pointsEarned));
    }
    onUpdateTask(task.id, updates);
    setOverrides((current) => {
      const { [key]: _, ...rest } = current;
      return rest;
    });
  };

  const clearWhatIf = () => setOverrides({});

  const mergeCategoryDefaults = (rows: GradebookRow[]) => {
    if (!selected) return;
    const suggested = suggestCategoryDefaults(rows);
    if (!Object.keys(suggested).length) return;
    let next = categories.map((cat) =>
      suggested[cat.id] != null && cat.defaultPoints == null
        ? { ...cat, defaultPoints: suggested[cat.id] }
        : cat,
    );
    if (suggested.discussions != null && !next.some((cat) => cat.id === "discussions")) {
      next = [
        ...next,
        { id: "discussions", name: "Discussions", weight: 10, defaultPoints: suggested.discussions },
      ];
    }
    onUpdateClass(selected.id, { gradeCategories: next });
  };

  const applyGradebookRows = (rows: GradebookRow[]) => {
    if (!selected || !rows.length) return;
    const plan = planGradebookApply(courseTasks, rows);
    for (const update of plan.updates) {
      onUpdateTask(update.id, {
        pointsPossible: update.pointsPossible,
        academicType: update.academicType,
        ...(update.pointsEarned != null ? { pointsEarned: update.pointsEarned } : {}),
      });
    }
    if (plan.creates.length && onCreateGradeItems) {
      onCreateGradeItems(
        selected.id,
        plan.creates.map((row) => ({
          title: row.title,
          academicType: row.academicType,
          pointsPossible: row.pointsPossible,
          pointsEarned: row.pointsEarned,
        })),
      );
    }
    mergeCategoryDefaults(rows);
    const created = onCreateGradeItems ? plan.creates.length : 0;
    setImportNotice(
      `Updated ${plan.updates.length} item${plan.updates.length === 1 ? "" : "s"}` +
        (created ? ` · added ${created} new` : plan.creates.length ? ` · ${plan.creates.length} not matched — add them below or create assignments first` : ""),
    );
    setImportText("");
    setManualTitle("");
    setManualPoints("");
  };

  const applyPaste = () => {
    if (!importPreview.length) {
      setImportNotice("Paste grade items with points — from Canvas, Blackboard, Moodle, Brightspace, or a plain list.");
      return;
    }
    applyGradebookRows(importPreview);
  };

  const addManualRow = () => {
    const title = manualTitle.trim();
    const points = Number(manualPoints);
    if (!title || !Number.isFinite(points) || points <= 0) {
      setImportNotice("Add a title and points (e.g. Discussion post · 20).");
      return;
    }
    applyGradebookRows(parseGradebookText(`${title}\t${points}`));
  };

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
            onClick={() => {
              setSelectedId(course.id);
              setOverrides({});
              setEditingScheme(false);
              setImportOpen(false);
              setImportNotice("");
            }}
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
        <button
          type="button"
          className="school-btn school-btn-ghost school-btn-sm"
          data-testid="school-grades-import-points"
          onClick={() => {
            setImportOpen((value) => !value);
            setImportNotice("");
          }}
        >
          <Upload size={14} /> {importOpen ? "Close import" : "Import points"}
        </button>
        <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={() => setEditingScheme((value) => !value)}>
          {editingScheme ? "Done editing" : "Edit scale & scheme"}
        </button>
        {Object.keys(overrides).length > 0 && (
          <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={clearWhatIf}>
            Clear what-if
          </button>
        )}
      </div>

      {importOpen && (
        <div className="school-card school-grades-import" data-testid="school-grades-import">
          <strong>Add your grade items</strong>
          <p className="school-grades-hint">
            Works with Canvas, Blackboard, Moodle, and Brightspace — paste a gradebook table, or add one item at a time.
            Matching titles update points; new titles are added to this class.
          </p>

          <label className="school-grades-import-manual">
            <span>Add one</span>
            <div className="school-grades-import-manual-row">
              <input
                aria-label="Grade item title"
                placeholder="e.g. Week 2 discussion"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
              />
              <input
                aria-label="Points possible"
                type="number"
                min={1}
                step={0.5}
                placeholder="Pts"
                value={manualPoints}
                onChange={(event) => setManualPoints(event.target.value)}
              />
              <button type="button" className="school-btn school-btn-primary school-btn-sm" onClick={addManualRow}>
                <Plus size={14} /> Add
              </button>
            </div>
          </label>

          <label className="school-grades-import-paste">
            <span>Or paste from your LMS</span>
            <textarea
              data-testid="school-grades-import-text"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={"Canvas / Blackboard / Moodle / Brightspace\nAssignment Name\tPoints\nDiscussion 1\t20\nEssay 1\t100"}
              rows={6}
            />
          </label>

          {importPreview.length > 0 && (
            <div className="school-sheet-preview" data-testid="school-grades-import-preview">
              <p className="school-grades-hint">
                Preview · {importPreview.length} item{importPreview.length === 1 ? "" : "s"}
              </p>
              {importPreview.slice(0, 8).map((row) => (
                <div key={`${row.title}-${row.pointsPossible}`} className="school-grades-import-preview-row">
                  <span>{row.title}</span>
                  <strong>{row.pointsPossible} pts</strong>
                </div>
              ))}
              {importPreview.length > 8 ? (
                <p className="school-grades-hint">+{importPreview.length - 8} more…</p>
              ) : null}
            </div>
          )}

          <div className="school-grades-import-actions">
            <button
              type="button"
              className="school-btn school-btn-primary school-btn-sm"
              data-testid="school-grades-import-apply"
              disabled={!importPreview.length}
              onClick={applyPaste}
            >
              Apply to {selected.code}
            </button>
          </div>
          {importNotice ? <p className="school-grades-hint" role="status">{importNotice}</p> : null}
        </div>
      )}

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
                <strong>Scheme (weights &amp; default points)</strong>
                <button
                  type="button"
                  className="school-btn school-btn-ghost school-btn-sm"
                  onClick={() => {
                    const id = `cat-${Date.now().toString(36)}`;
                    onUpdateClass(selected.id, {
                      gradeCategories: [...categories, { id, name: "New category", weight: 5, defaultPoints: 100 }],
                    });
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="school-grades-cat-editor">
                <div className="school-grades-cat-headers" aria-hidden>
                  <span>Category</span>
                  <span>%</span>
                  <span>Pts</span>
                  <span />
                </div>
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
                      <span className="sr-only">Weight %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={cat.weight}
                        aria-label={`${cat.name} weight percent`}
                        onChange={(event) => {
                          onUpdateClass(selected.id, {
                            gradeCategories: categories.map((row) =>
                              row.id === cat.id ? { ...row, weight: Number(event.target.value) || 0 } : row,
                            ),
                          });
                        }}
                      />
                    </label>
                    <label>
                      <span className="sr-only">Default points</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={cat.defaultPoints ?? ""}
                        placeholder="—"
                        aria-label={`${cat.name} default points`}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const nextPoints =
                            raw === "" ? undefined : Math.max(0, Number(raw) || 0) || undefined;
                          onUpdateClass(selected.id, {
                            gradeCategories: categories.map((row) =>
                              row.id === cat.id
                                ? { ...row, defaultPoints: nextPoints }
                                : row,
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
                  Weights total {categories.reduce((sum, cat) => sum + cat.weight, 0).toFixed(0)}%.
                  Pts is the usual score out of for that category (e.g. Discussions = 20) — used when an assignment has no points set yet.
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
          <p className="school-grades-hint">
            Possible points save as you type. Trial earned scores stay local until you hit Save score.
          </p>
        </div>
      )}

      {mode === "categories" && result && (
        <div className="school-card" style={{ padding: "10px 0" }}>
          {result.categories.map((cat) => (
            <div key={cat.id} className="school-grades-cat-summary">
              <div>
                <strong>{cat.name}</strong>
                <small>
                  {cat.weight}% of course
                  {categories.find((row) => row.id === cat.id)?.defaultPoints != null
                    ? ` · ${categories.find((row) => row.id === cat.id)!.defaultPoints} pts each`
                    : ""}
                  {" · "}{cat.gradedCount} graded · {cat.openCount} open
                </small>
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
            const categoryDefault = resolvePointsPossible(
              { ...task, pointsPossible: undefined },
              categories,
            );
            const possible =
              override?.pointsPossible ??
              task.pointsPossible ??
              categoryDefault ??
              "";
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
                      onChange={(event) => {
                        const gradeCategoryId = event.target.value;
                        const cat = categories.find((row) => row.id === gradeCategoryId);
                        const patch: Partial<Pick<GradesTask, "gradeCategoryId" | "pointsPossible">> = {
                          gradeCategoryId,
                        };
                        if (
                          task.pointsPossible == null &&
                          typeof cat?.defaultPoints === "number" &&
                          cat.defaultPoints > 0
                        ) {
                          patch.pointsPossible = cat.defaultPoints;
                        }
                        onUpdateTask(task.id, patch);
                      }}
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
                            categoryDefault,
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
                      placeholder={categoryDefault != null ? String(categoryDefault) : "100"}
                      data-testid={`grades-possible-${task.id}`}
                      onChange={(event) => persistPossible(task, event.target.value)}
                      onBlur={(event) => {
                        // If still only a category/type default, pin it onto the assignment once.
                        if (
                          task.pointsPossible == null &&
                          event.target.value !== "" &&
                          Number(event.target.value) > 0
                        ) {
                          persistPossible(task, event.target.value);
                        }
                      }}
                    />
                  </label>
                  {override?.pointsEarned != null && (
                    <button
                      type="button"
                      className="school-btn school-btn-primary school-btn-sm"
                      data-testid={`grades-save-${task.id}`}
                      onClick={() => persistScore(task)}
                    >
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                className="school-btn school-btn-primary school-btn-sm"
                onClick={() => setImportOpen(true)}
              >
                <Upload size={14} /> Import points
              </button>
              {onNewAcademic && (
                <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={onNewAcademic}>
                  <PieChart size={14} /> Add assignment
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
