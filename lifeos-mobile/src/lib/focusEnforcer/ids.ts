/** Stable Expo notification identifiers. Prefix `fe:` survives workspace task/event sync. */

export const FE_NOTIF_PREFIX = "fe:";

export function feStartNotifId(sessionId: string) {
  return `${FE_NOTIF_PREFIX}${sessionId}:start`;
}

/** levelIndex is 1-based matching escalateOffsetsMin order (1=gentle, 2=firm, 3=severe). */
export function feEscalationNotifId(sessionId: string, levelIndex: 1 | 2 | 3) {
  return `${FE_NOTIF_PREFIX}${sessionId}:esc:${levelIndex}`;
}

export function feCheckNotifId(sessionId: string, checkId: string) {
  return `${FE_NOTIF_PREFIX}${sessionId}:check:${checkId}`;
}

export function feReturnNotifId(sessionId: string, checkId: string) {
  return `${FE_NOTIF_PREFIX}${sessionId}:return:${checkId}`;
}

export function allEscalationNotifIds(sessionId: string) {
  return [
    feEscalationNotifId(sessionId, 1),
    feEscalationNotifId(sessionId, 2),
    feEscalationNotifId(sessionId, 3),
  ] as const;
}

export function isFocusEnforcerNotifId(id: string) {
  return id.startsWith(FE_NOTIF_PREFIX);
}

export function sessionNotifIds(sessionId: string, checkIds: string[] = []): string[] {
  return [
    feStartNotifId(sessionId),
    ...allEscalationNotifIds(sessionId),
    ...checkIds.flatMap((checkId) => [feCheckNotifId(sessionId, checkId), feReturnNotifId(sessionId, checkId)]),
  ];
}
