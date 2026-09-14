import JSZip from "jszip";

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
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const ASSIGNMENT_HINT =
  /\b(assignment|homework|hw\s*\d*|essay|paper|project|midterm|final|exam|quiz|lab|problem\s*set|pset|reading|discussion|presentation|report|due)\b/i;

const SKIP_LINE =
  /^(page\s*\d+|\d+\s*\/\s*\d+|table of contents|syllabus|course\s*(code|title|schedule)|instructor|office hours|grading|policies|week\s*\d+\s*$)/i;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(year: number, month: number, day: number) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function inferYear(month: number, day: number, fallbackYear: number) {
  const probe = new Date(fallbackYear, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (probe.getTime() < today.getTime() - 30 * 86400000) return fallbackYear + 1;
  return fallbackYear;
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
  if (/\b(midterm|final|exam)\b/i.test(title)) return "Exam";
  if (/\bquiz\b/i.test(title)) return "Quiz";
  if (/\blab\b/i.test(title)) return "Lab";
  if (/\b(reading|chapter|ch\.?\s*\d+)\b/i.test(title)) return "Reading";
  if (/\bdiscussion\b/i.test(title)) return "Discussion";
  if (/\bproject\b/i.test(title)) return "Project";
  return "Assignment";
}

export function parseSyllabusText(raw: string): SyllabusItem[] {
  const year = new Date().getFullYear();
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim())
    .filter((line) => line.length >= 3 && !SKIP_LINE.test(line));

  const items: SyllabusItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const { title, due } = extractDueDate(line, year);
    if (title.length < 3 || title.length > 160) continue;
    const interesting = Boolean(due) || ASSIGNMENT_HINT.test(line);
    if (!interesting && lines.length > 12) continue;
    const key = `${title.toLowerCase()}|${due ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, due, academicType: inferAcademicType(title) });
  }

  return items.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
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

export function extractTextFromPdfBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  const chunks: string[] = [];
  const tj = /\[([\s\S]*?)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(binary))) {
    const inner = match[1];
    const parts = [...inner.matchAll(/\((?:\\.|[^\\)])*\)/g)].map((m) => decodePdfString(m[0].slice(1, -1)));
    if (parts.length) chunks.push(parts.join(""));
  }
  const simple = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  while ((match = simple.exec(binary))) {
    chunks.push(decodePdfString(match[0].replace(/\s*Tj$/, "").slice(1, -1)));
  }

  if (chunks.join("").trim().length < 40) {
    const runs = binary.match(/[A-Za-z0-9][A-Za-z0-9 ,./:\-()'%]{4,}/g) || [];
    return runs.join("\n");
  }

  return chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
