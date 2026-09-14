import JSZip from "jszip";
import { inflate } from "pako";

export type SyllabusAcademicType =
  | "Assignment"
  | "Exam"
  | "Quiz"
  | "Lab"
  | "Reading"
  | "Discussion"
  | "Project";

export type SyllabusItem = {
  title: string;
  due?: string;
  academicType: SyllabusAcademicType;
  /** 1-based module / week index when inferred from a module schedule. */
  module?: number;
};

export type ParseSyllabusOptions = {
  /** YYYY-MM-DD first day of Module/Week 1. Module N due = start + (N-1)*7 + 6 days. */
  termStart?: string;
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const ASSIGNMENT_HINT =
  /\b(assignment|homework|hw\s*\d*|essay|paper|project|midterm|final|exam|quiz|lab|problem\s*set|pset|reading|discussion|presentation|report|due|milestone|short\s*paper)\b/i;

const SKIP_LINE =
  /^(page\s*\d+|p\s*a\s*g\s*e|table of contents|syllabus|course\s*(code|title|schedule|prerequisites|description|outcomes)|instructor|office hours|grading(\s*guides)?|policies|required materials|technical requirements|diversity|grade distribution|university grading|weekly assignment schedule|module topics and assignments|course participation|late assignments|student handbook|academic integrity|copyright|withdrawal|use of (open|artificial)|ada\/?504|all readings can be found|assignments and discussion posts)/i;

const POLICY_NOISE =
  /\b(late assignment|late policy|grade of zero|penalty of|forfeit|administratively removed|grading system|point value|total points|graded items|non-graded|incomplete grade|student concern|dispute resolution|accessibility|disability|plagiarism|generative ai|open educational|copyright act|core values|growth mindset)\b/i;

/** SNHU-style `1-1 Discussion: …`, `2-2 Final Project Milestone One: …` */
const MODULE_ITEM =
  /^(\d+)\s*[-–.]\s*(\d+)\s+(.+)$/;

const MODULE_HEADER =
  /^(?:module\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i;

const WORD_MODULES: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(year: number, month: number, day: number) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateKey(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const dt = new Date(`${value}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function addDaysKey(start: Date, days: number) {
  const dt = new Date(start);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** End of module week N when term starts on `termStart` (Module 1 = days 0–6). */
export function dueForModule(termStart: string, module: number) {
  const start = parseDateKey(termStart);
  if (!start || module < 1) return undefined;
  return addDaysKey(start, (module - 1) * 7 + 6);
}

function inferYear(month: number, day: number, fallbackYear: number) {
  const probe = new Date(fallbackYear, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (probe.getTime() < today.getTime() - 30 * 86400000) return fallbackYear + 1;
  return fallbackYear;
}

function dateLooksPlausible(due: string, termStart?: string) {
  const dueDt = parseDateKey(due);
  if (!dueDt) return false;
  const anchor = parseDateKey(termStart) ?? new Date();
  const min = new Date(anchor);
  min.setDate(min.getDate() - 45);
  const max = new Date(anchor);
  max.setFullYear(max.getFullYear() + 2);
  return dueDt.getTime() >= min.getTime() && dueDt.getTime() <= max.getTime();
}

export function extractDueDate(line: string, fallbackYear = new Date().getFullYear()): { title: string; due?: string } {
  let working = line;
  let due: string | undefined;

  const trySet = (year: number, month: number, day: number, matched: string) => {
    const key = toKey(year, month, day);
    if (!key) return false;
    due = key;
    working = working.replace(matched, " ");
    return true;
  };

  const iso = working.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) trySet(Number(iso[1]), Number(iso[2]), Number(iso[3]), iso[0]);

  if (!due) {
    const named = working.match(
      /\b(?:due(?:\s*(?:date|on|:))?\s*)?((jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?)\b/i,
    );
    if (named) {
      const month = MONTHS[named[2].toLowerCase().replace(/\.$/, "")];
      const day = Number(named[3]);
      const year = named[4] ? Number(named[4]) : inferYear(month, day, fallbackYear);
      trySet(year, month, day, named[1]);
    }
  }

  if (!due) {
    const namedRev = working.match(
      /\b((\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?(?:,?\s*(\d{4}))?)\b/i,
    );
    if (namedRev) {
      const dayNum = Number(namedRev[2]);
      const month = MONTHS[namedRev[3].toLowerCase().replace(/\.$/, "")];
      const year = namedRev[4] ? Number(namedRev[4]) : inferYear(month, dayNum, fallbackYear);
      if (month && dayNum) trySet(year, month, dayNum, namedRev[1]);
    }
  }

  if (!due) {
    const slash = working.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (slash) {
      const month = Number(slash[1]);
      const day = Number(slash[2]);
      let year = slash[3] ? Number(slash[3]) : inferYear(month, day, fallbackYear);
      if (year < 100) year += 2000;
      trySet(year, month, day, slash[0]);
    }
  }

  if (!due) {
    const dashed = working.match(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/);
    if (dashed) trySet(Number(dashed[3]), Number(dashed[1]), Number(dashed[2]), dashed[0]);
  }

  const title = working
    .replace(/\bdue(?:\s*(?:date|on))?[:\-]?\s*/gi, " ")
    .replace(/[|•·]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:·•|]+|[\s\-–—:·•|]+$/g, "")
    .replace(/\s*[\-–—]\s*$/g, "")
    .trim();

  return { title: title || line.trim(), due };
}

function inferAcademicType(title: string): SyllabusAcademicType {
  if (/\b(midterm|final\s+exam|exam)\b/i.test(title) && !/\bfinal\s+project\b/i.test(title) && !/\bfinal\s+submission\b/i.test(title)) {
    return "Exam";
  }
  if (/\bquiz\b/i.test(title)) return "Quiz";
  if (/\blab\b/i.test(title)) return "Lab";
  if (/\b(reading|chapter|ch\.?\s*\d+)\b/i.test(title)) return "Reading";
  if (/\bdiscussion\b/i.test(title)) return "Discussion";
  if (/\b(project|milestone|final\s+submission)\b/i.test(title)) return "Project";
  return "Assignment";
}

function cleanTitle(raw: string) {
  return raw
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:·•|]+|[\s\-–—:·•|]+$/g, "")
    .trim();
}

function isGradedModuleItem(title: string) {
  return /\b(discussion|short\s*paper|milestone|final\s+submission|homework|assignment|quiz|exam|lab|project|essay|paper)\b/i.test(title)
    && !/\breview:\s*final\s+project\b/i.test(title);
}

function coalesceBrokenModuleLabels(text: string) {
  // PDFs often emit "1\n-\n1 Discussion" or "2\n-\n1\nDiscussion: …" as separate draws.
  return text
    .replace(
      /(\d+)\s*\n\s*[-–]\s*\n\s*(\d+)\s*\n\s*(?=(?:Discussion|Short\s*Paper|Review|Final\s+Project|Milestone|Homework|Assignment|Quiz|Exam|Lab|Project|Essay|Paper)\b)/gi,
      "$1-$2 ",
    )
    .replace(/(\d+)\s*\n\s*[-–]\s*\n\s*(\d+)([ \t]+)/g, "$1-$2$3")
    .replace(/(\d+)\s*\n\s*[-–]\s*\n\s*(\d+)(?=\S)/g, "$1-$2 ");
}

/**
 * Parse free text / markdown / extracted syllabus copy into assignment rows.
 * Pass `termStart` to map module schedules (e.g. SNHU `1-1 Discussion`) onto calendar dates.
 */
export function parseSyllabusText(raw: string, options: ParseSyllabusOptions = {}): SyllabusItem[] {
  const termStart = options.termStart;
  const year = parseDateKey(termStart)?.getFullYear() ?? new Date().getFullYear();
  const lines = coalesceBrokenModuleLabels(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*•]\s+/, "").trim())
    .filter((line) => line.length >= 3 && !SKIP_LINE.test(line));

  const moduleItems: SyllabusItem[] = [];
  const datedItems: SyllabusItem[] = [];
  const seen = new Set<string>();

  const push = (bucket: SyllabusItem[], item: SyllabusItem) => {
    const key = `${item.title.toLowerCase()}|${item.due ?? ""}|${item.module ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    bucket.push(item);
  };

  for (const line of lines) {
    if (POLICY_NOISE.test(line) && !MODULE_ITEM.test(line)) continue;
    if (MODULE_HEADER.test(line) && !MODULE_ITEM.test(line) && line.length < 80) continue;

    const moduleMatch = line.match(MODULE_ITEM);
    if (moduleMatch) {
      const moduleNumber = Number(moduleMatch[1]);
      const title = cleanTitle(moduleMatch[3]);
      if (!title || title.length > 160 || !isGradedModuleItem(title)) continue;
      const due = termStart ? dueForModule(termStart, moduleNumber) : undefined;
      push(moduleItems, {
        title: `${moduleMatch[1]}-${moduleMatch[2]} ${title}`.replace(/\s{2,}/g, " ").trim(),
        due,
        academicType: inferAcademicType(title),
        module: moduleNumber,
      });
      continue;
    }

    const { title, due: rawDue } = extractDueDate(line, year);
    if (title.length < 3 || title.length > 160) continue;
    if (POLICY_NOISE.test(title)) continue;

    let due = rawDue;
    if (due && !dateLooksPlausible(due, termStart)) {
      // Keep the line if it still looks like coursework, but drop stale policy dates.
      due = undefined;
    }
    const interesting = Boolean(due) || ASSIGNMENT_HINT.test(line);
    if (!interesting) continue;
    // Without an explicit date, only keep strong coursework titles (avoid grade-table noise).
    if (!due && !/\b(assignment|homework|quiz|exam|lab|discussion|milestone|short\s*paper|project|essay)\b/i.test(title)) {
      continue;
    }
    push(datedItems, { title: cleanTitle(title), due, academicType: inferAcademicType(title) });
  }

  // Prefer structured module rows when the syllabus is module-based (e.g. IT 520).
  const items = moduleItems.length >= 3 ? moduleItems : [...moduleItems, ...datedItems];
  return items.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title));
}

function decodePdfString(raw: string) {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractOperatorsFromContent(content: string) {
  const chunks: string[] = [];
  const tj = /\[([\s\S]*?)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(content))) {
    const parts = [...match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((m) => decodePdfString(m[0].slice(1, -1)));
    if (parts.length) chunks.push(parts.join(""));
  }
  const simple = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  while ((match = simple.exec(content))) {
    chunks.push(decodePdfString(match[0].replace(/\s*Tj$/, "").slice(1, -1)));
  }
  return chunks;
}

function latin1Bytes(raw: string) {
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i) & 0xff;
  return bytes;
}

/** Best-effort text extract for text PDFs, including FlateDecode content streams. */
export function extractTextFromPdfBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  const chunks: string[] = [];

  // Inflate FlateDecode streams first (common for syllabus PDFs from Word/Canvas).
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRe.exec(binary))) {
    let payload = streamMatch[1];
    if (payload.endsWith("\r")) payload = payload.slice(0, -1);
    try {
      const inflated = inflate(latin1Bytes(payload));
      let decoded = "";
      for (let i = 0; i < inflated.length; i += 1) decoded += String.fromCharCode(inflated[i]);
      chunks.push(...extractOperatorsFromContent(decoded));
    } catch {
      // Not a zlib stream — ignore.
    }
  }

  chunks.push(...extractOperatorsFromContent(binary));

  const joined = chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (joined.length >= 40) return joined;

  const runs = binary.match(/[A-Za-z0-9][A-Za-z0-9 ,./:\-()'%]{4,}/g) || [];
  return runs.join("\n");
}

async function extractDocxText(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("This Word file has no readable document.xml.");
  const xml = await doc.async("string");
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();

  if (name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt") || mime.startsWith("text/")) {
    return file.text();
  }

  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return extractDocxText(bytes);
  }

  if (name.endsWith(".doc") && !name.endsWith(".docx")) {
    throw new Error("Legacy .doc files aren't supported. Save as .docx, PDF, or Markdown and try again.");
  }

  if (name.endsWith(".pdf") || mime === "application/pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = extractTextFromPdfBytes(bytes);
    if (!text.trim()) {
      throw new Error("Couldn't read text from this PDF. It may be scanned — paste the text, or export a text PDF.");
    }
    return text;
  }

  try {
    return await file.text();
  } catch {
    throw new Error("Unsupported file type. Use PDF, Word (.docx), Markdown, or plain text.");
  }
}
