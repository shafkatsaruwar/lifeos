import { verifyFocusEnforcerProof } from "../api";
import type { FocusProofPhase } from "./shared";

export type FocusVerifyRequest = {
  taskTitle: string;
  phase: FocusProofPhase;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  imageBase64: string;
};

export type FocusVerifyResponse = {
  match: boolean;
  confidence: number;
  reason: string;
};

/**
 * Calls focus-enforcer-verify via api.ts. Never logs imageBase64.
 * Failures become a soft verification failure (no throw with image data).
 */
export async function verifyFocusProof(input: FocusVerifyRequest): Promise<FocusVerifyResponse> {
  return verifyFocusEnforcerProof(input);
}
