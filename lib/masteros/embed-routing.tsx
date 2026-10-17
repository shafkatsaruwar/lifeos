"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useParams as useNextParams,
  usePathname as useNextPathname,
  useRouter as useNextRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export type MosEmbedNav = {
  path: string;
  search: string;
  navigate: (href: string) => void;
  back: () => void;
};

const MosEmbedContext = createContext<MosEmbedNav | null>(null);

export function MosEmbedProvider({
  path,
  search,
  navigate,
  back,
  children,
}: MosEmbedNav & { children: ReactNode }) {
  const value = useMemo(
    () => ({ path, search, navigate, back }),
    [path, search, navigate, back],
  );
  return <MosEmbedContext.Provider value={value}>{children}</MosEmbedContext.Provider>;
}

export function useMosEmbed() {
  return useContext(MosEmbedContext);
}

export function parseMosHref(href: string): { path: string; search: string } {
  try {
    const url = new URL(href, "http://lifeos.local");
    return { path: url.pathname.replace(/\/$/, "") || "/masteros", search: url.search };
  } catch {
    const [pathPart, searchPart = ""] = href.split("?");
    return {
      path: (pathPart || "/masteros").replace(/\/$/, "") || "/masteros",
      search: searchPart ? `?${searchPart}` : "",
    };
  }
}

export function mosPathToQuery(path: string): string {
  if (path === "/masteros" || path === "/masteros/") return "";
  return path.replace(/^\/masteros\/?/, "");
}

export function queryToMosPath(mos: string | null | undefined): string {
  if (!mos) return "/masteros";
  const cleaned = mos.replace(/^\//, "");
  return cleaned ? `/masteros/${cleaned}` : "/masteros";
}

function paramsFromPath(path: string): Record<string, string> {
  const patterns: { re: RegExp; keys: string[] }[] = [
    { re: /^\/masteros\/lessons\/([^/]+)\/teach$/, keys: ["id"] },
    { re: /^\/masteros\/lessons\/([^/]+)$/, keys: ["id"] },
    { re: /^\/masteros\/students\/([^/]+)\/report$/, keys: ["id"] },
    { re: /^\/masteros\/students\/([^/]+)$/, keys: ["id"] },
    { re: /^\/masteros\/courses\/([^/]+)$/, keys: ["id"] },
    { re: /^\/masteros\/assignments\/([^/]+)$/, keys: ["id"] },
  ];
  for (const pattern of patterns) {
    const match = path.match(pattern.re);
    if (!match) continue;
    const params: Record<string, string> = {};
    pattern.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1] ?? "");
    });
    return params;
  }
  return {};
}

export function useMosPathname(): string {
  const embed = useContext(MosEmbedContext);
  const next = useNextPathname();
  return embed?.path ?? next ?? "/masteros";
}

export function useMosSearchParams(): URLSearchParams {
  const embed = useContext(MosEmbedContext);
  const next = useNextSearchParams();
  if (embed) {
    const raw = embed.search.startsWith("?") ? embed.search.slice(1) : embed.search;
    return new URLSearchParams(raw);
  }
  return next;
}

export function useMosParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  const embed = useContext(MosEmbedContext);
  const next = useNextParams() as T;
  if (!embed) return next;
  return paramsFromPath(embed.path) as T;
}

export function useMosRouter() {
  const embed = useContext(MosEmbedContext);
  const next = useNextRouter();
  const navigate = useCallback(
    (href: string) => {
      if (embed) embed.navigate(href);
      else next.push(href);
    },
    [embed, next],
  );
  if (!embed) return next;
  return {
    push: navigate,
    replace: navigate,
    back: embed.back,
    forward: () => undefined,
    refresh: () => undefined,
    prefetch: async () => undefined,
  };
}

export function isMosFullscreenPath(path: string) {
  return path.includes("/teach") || path.includes("/report");
}
