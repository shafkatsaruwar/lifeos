import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { NotebookPage } from "../types";
import { useLifeOS } from "../lib/LifeOSContext";

/**
 * Renders an imported PDF page behind PencilKit when `page.pdfRef` is set.
 * Uses WKWebView which can display local PDF files on iOS.
 */
export function PdfPageUnderlay({ page }: { page: NotebookPage }) {
  const { theme } = useLifeOS();
  const ref = page.pdfRef;
  if (!ref?.storagePath) return null;

  const uri = ref.storagePath.startsWith("file://") ? ref.storagePath : `file://${ref.storagePath}`;
  // Jump to page via URL fragment when possible; WebView PDF viewer indexes from 1.
  const sourceUri = `${uri}#page=${ref.pageIndex + 1}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        source={{ uri: sourceUri }}
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
