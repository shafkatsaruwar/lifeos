export type NoteLike = {
  title: string;
  body: string;
  classId?: string;
  projectName?: string;
  template?: string;
};

export type TaskFromNoteDefaults = {
  defaultFocusMinutes: number;
  defaultEnergy: "Low" | "Medium" | "High";
};

export type TaskFromNotePayload = {
  title: string;
  notes: string;
  spaceValue: string;
};

export function stripNoteBody(body: string): string {
  return body
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function noteSpaceValue(note: NoteLike): string {
  if (note.classId) return `class:${note.classId}`;
  if (note.projectName) return `project:${note.projectName}`;
  return "";
}

export function parseActionItems(body: string): string[] {
  const plain = body.includes("<") ? stripNoteBody(body) : body;
  const marker = plain.match(/ACTION ITEMS:\s*/i);
  if (!marker || marker.index == null) return [];
  const section = plain.slice(marker.index + marker[0].length);
  return section
    .split(/\n/)
    .map((line) => line.replace(/^[\s•\-*\d.)]+/, "").trim())
    .filter(Boolean);
}

export function buildTasksFromNote(note: NoteLike, _defaults: TaskFromNoteDefaults): TaskFromNotePayload[] {
  const plainBody = stripNoteBody(note.body);
  const spaceValue = noteSpaceValue(note);
  const actionItems = note.template === "meeting" ? parseActionItems(note.body) : [];

  if (actionItems.length > 0) {
    const context = plainBody.slice(0, 500);
    const prefix = note.title?.trim() ? `From "${note.title.trim()}":\n` : "From meeting note:\n";
    return actionItems.map((item) => ({
      title: item,
      notes: context ? `${prefix}${context}` : "",
      spaceValue,
    }));
  }

  const title = note.title?.trim() || plainBody.slice(0, 80) || "Untitled";
  const notes = plainBody && plainBody !== title ? plainBody : "";
  return [{ title, notes, spaceValue }];
}
