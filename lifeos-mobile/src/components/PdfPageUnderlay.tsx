import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { NotebookPage } from "../types";
import { resolvePdfPageImageUri } from "../lib/notebookPdf";
import { useLifeOS } from "../lib/LifeOSContext";

function toFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/**
 * Renders an imported PDF page behind PencilKit when `page.pdfRef` is set.
 * Uses native PDFKit → cached PNG so each notebook page shows the correct PDF page.
 */
export function PdfPageUnderlay({ page }: { page: NotebookPage }) {
  const { theme } = useLifeOS();
  const ref = page.pdfRef;
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!ref?.storagePath) {
      setImageUri(null);
      return;
    }
    let cancelled = false;
    resolvePdfPageImageUri(ref).then((path) => {
      if (!cancelled && path) setImageUri(toFileUri(path));
    });
    return () => {
      cancelled = true;
    };
  }, [ref?.storagePath, ref?.pageIndex, ref?.previewImagePath]);

  if (!ref?.storagePath || !imageUri) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
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
  image: { flex: 1, width: "100%", height: "100%", backgroundColor: "#fff" },
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
