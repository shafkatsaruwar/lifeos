import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { NotebookPage } from "../types";
import { resolvePdfDisplayUri } from "../lib/notebookPdf";
import { useLifeOS } from "../lib/LifeOSContext";

/**
 * Renders an imported PDF page behind PencilKit when `page.pdfRef` is set.
 * Uses WKWebView with single-page PDF files — iOS ignores `#page=` URL fragments on local PDFs.
 */
export function PdfPageUnderlay({ page }: { page: NotebookPage }) {
  const { theme } = useLifeOS();
  const ref = page.pdfRef;
  const [displayPath, setDisplayPath] = useState<string | null>(null);

  useEffect(() => {
    if (!ref?.storagePath) {
      setDisplayPath(null);
      return;
    }
    let cancelled = false;
    resolvePdfDisplayUri(ref).then((path) => {
      if (!cancelled) setDisplayPath(path);
    });
    return () => {
      cancelled = true;
    };
  }, [ref?.storagePath, ref?.pageIndex]);

  if (!ref?.storagePath || !displayPath) return null;

  const uri = displayPath.startsWith("file://") ? displayPath : `file://${displayPath}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        source={{ uri }}
        style={styles.web}
        originWhitelist={["*"]}
        allowFileAccess
        allowingReadAccessToURL={uri}
        scalesPageToFit
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
      <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "700" }}>
          PDF p.{ref.pageIndex + 1}
          {ref.pageCount ? `/${ref.pageCount}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: "#fff", opacity: 0.92 },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
