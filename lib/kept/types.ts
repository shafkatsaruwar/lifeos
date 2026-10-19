/** Kept — voice-first memory for physical objects & locations only. */

export const KEPT_MAX_LOCATION_HISTORY = 20;
export const KEPT_MAX_ITEMS = 500;
export const KEPT_MAX_NAME = 120;
export const KEPT_MAX_LOCATION = 160;
export const KEPT_MAX_NOTES = 2_000;
export const KEPT_MAX_ALIASES = 12;

export type KeptPrivacy = "normal" | "private";

export type KeptLocationEntry = {
  location: string;
  at: string;
  note?: string;
};

export type KeptItem = {
  id: string;
  /** Display name of the object (not a place). */
  name: string;
  aliases: string[];
  location: string;
  /** Bounded separately from item fields — newest first. */
  locationHistory: KeptLocationEntry[];
  notes: string;
  photoUrl?: string;
  privacy: KeptPrivacy;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  forgottenAt?: string;
};

export type KeptHub = {
  items: KeptItem[];
  updatedAt: string;
};

export type KeptIntentKind =
  | "SAVE"
  | "FIND"
  | "UPDATE"
  | "LIST_BY_LOCATION"
  | "FORGET"
  | "CLARIFY";

export type KeptCommand =
  | {
      kind: "SAVE";
      name: string;
      location: string;
      notes?: string;
      privacy?: KeptPrivacy;
      aliases?: string[];
    }
  | {
      kind: "FIND";
      query: string;
    }
  | {
      kind: "UPDATE";
      itemId?: string;
      query?: string;
      location?: string;
      notes?: string;
      name?: string;
      privacy?: KeptPrivacy;
      archived?: boolean;
      photoUrl?: string | null;
    }
  | {
      kind: "LIST_BY_LOCATION";
      location: string;
    }
  | {
      kind: "FORGET";
      itemId?: string;
      query?: string;
      hard?: boolean;
    }
  | {
      kind: "CLARIFY";
      question: string;
      options?: string[];
      pendingKind?: Exclude<KeptIntentKind, "CLARIFY">;
    };

export type KeptIntentResult = {
  command: KeptCommand;
  confidence: number;
  /** Human-readable echo of what we understood. */
  summary: string;
  /** Candidate item ids for FIND / UPDATE / FORGET when ambiguous. */
  candidateIds?: string[];
};

export type KeptExecuteResult =
  | { ok: true; message: string; item?: KeptItem; items?: KeptItem[]; hub: KeptHub }
  | { ok: false; message: string; clarify?: KeptCommand & { kind: "CLARIFY" }; hub: KeptHub };

export function emptyKeptHub(): KeptHub {
  return { items: [], updatedAt: new Date(0).toISOString() };
}
