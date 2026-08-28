import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { NotebookPage } from "../types";
import { buildPdfJsViewerHtml } from "../lib/pdfViewerHtml";
import { resolvePdfDisplayPayload } from "../lib/notebookPdf";
import { useLifeOS } from "../lib/LifeOSContext";

/**
 * Renders an imported PDF page behind PencilKit when `page.pdfRef` is set.
 * Uses PDF.js inside WebView — iOS WKWebView ignores `#page=` on local PDF URIs.
 */
export function PdfPageUnderlay({ page }: { page: NotebookPage }) {
  const { theme } = useLifeOS();
  const ref = page.pdfRef;
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!ref?.storagePath) {
      setViewerHtml(null);
      return;
    }
    let cancelled = false;
    resolvePdfDisplayPayload(ref).then((payload) => {
      if (cancelled || !payload) return;
      setViewerHtml(buildPdfJsViewerHtml(payload.base64, payload.pageNumber));
    });
    return () => {
      cancelled = true;
    };
  }, [ref?.storagePath, ref?.pageIndex]);

  if (!ref?.storagePath || !viewerHtml) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        source={{ html: viewerHtml }}
        style={styles.web}
        originWhitelist={["*"]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled
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
