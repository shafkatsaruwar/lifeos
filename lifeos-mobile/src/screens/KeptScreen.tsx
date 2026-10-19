import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { Page, Subtitle, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  createMicInactivityTimer,
  emptyKeptHub,
  executeKeptCommand,
  KEPT_LISTENING_CANCELED_STATUS,
  locationsIndex,
  recentKept,
  resolveKeptIntent,
  searchKept,
  type KeptHub,
  type KeptItem,
  type KeptPrivacy,
  type MicInactivityTimer,
} from "../lib/kept/shared";
import { loadKeptHub, saveKeptHub, subscribeKeptHub } from "../lib/kept/store";
import { isSpeechRecognitionAvailable, startDictation, stopDictation } from "../lib/speechRecognition";

type Phase = "idle" | "listening" | "processing" | "confirm" | "done" | "error";

const PAGE_TAGLINE = "A place for everything you want to remember.";

/** Mic card primary line — never repeats the page tagline; idle stays quiet. */
function keptVoicePrimary(phase: Phase, status: string, speechOk: boolean, transcript: string): string {
  if (phase === "listening") return transcript.trim() || "Listening…";
  if (phase === "processing") return status.trim() || "Understanding…";
  if (phase === "idle") {
    if (status.trim()) return status.trim();
    return speechOk ? "Tap to speak" : "Type below — mic unavailable";
  }
  return status.trim() || (phase === "error" ? "Try again" : "Done");
}

/** Secondary phase chip — Listening / Processing only (never permanent IDLE). */
function keptVoicePhaseLabel(phase: Phase): string | null {
  if (phase === "listening") return "Listening";
  if (phase === "processing") return "Processing";
  return null;
}

function bump() {
  try {
    Vibration.vibrate(12);
  } catch {
    /* optional */
  }
}

export function KeptScreen() {
  const { user, theme, workspace } = useLifeOS();
  const insets = useSafeAreaInsets();
  const tabPad = useFloatingTabBarContentPadding(24);
  const reduceMotion = Boolean(workspace.settings.reduceMotion);

  const [hub, setHub] = useState<KeptHub>(emptyKeptHub);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<KeptItem | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPrivacy, setManualPrivacy] = useState<KeptPrivacy>("normal");
  const stopRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const listenCancelledRef = useRef(false);
  const inactivityRef = useRef<MicInactivityTimer | null>(null);
  const speechOk = isSpeechRecognitionAvailable();

  phaseRef.current = phase;

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const initial = await loadKeptHub(user.uid);
        if (!cancelled) {
          setHub(initial);
          setHydrated(true);
        }
      } catch {
        if (!cancelled) setHydrated(true);
      }
      unsub = subscribeKeptHub(user.uid, (next) => {
        if (!cancelled) setHub(next);
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
      inactivityRef.current?.clear();
      inactivityRef.current = null;
      stopDictation();
      stopRef.current?.();
    };
  }, [user.uid]);

  const clearInactivity = () => {
    inactivityRef.current?.clear();
    inactivityRef.current = null;
  };

  const cancelListening = () => {
    if (phaseRef.current !== "listening") return;
    listenCancelledRef.current = true;
    clearInactivity();
    stopDictation();
    stopRef.current?.();
    stopRef.current = null;
    setTranscript("");
    setPhase("idle");
    setStatus(KEPT_LISTENING_CANCELED_STATUS);
  };

  const armInactivity = () => {
    clearInactivity();
    inactivityRef.current = createMicInactivityTimer(cancelListening);
  };

  const persist = useCallback(
    async (next: KeptHub, message: string) => {
      setHub(next);
      setStatus(message);
      bump();
      try {
        await saveKeptHub(user.uid, next);
      } catch {
        Alert.alert("Kept", "Saved on device, but cloud sync failed. Check your connection.");
      }
    },
    [user.uid],
  );

  const visible = useMemo(() => {
    let items = searchKept(hub, query, { includePrivate: true });
    if (locationFilter) {
      const needle = locationFilter.toLowerCase();
      items = items.filter((i) => i.location.toLowerCase().includes(needle));
    }
    return items;
  }, [hub, query, locationFilter]);

  const recent = useMemo(() => recentKept(hub, 20, true), [hub]);
  const places = useMemo(() => locationsIndex(hub, true).slice(0, 10), [hub]);
  const listData = query || locationFilter ? visible : recent.length ? recent : visible;
  const voicePrimary = keptVoicePrimary(phase, status, speechOk, transcript);
  const voicePhase = keptVoicePhaseLabel(phase);

  const runUtterance = async (text: string) => {
    const utterance = text.trim();
    if (!utterance) return;
    setPhase("processing");
    setStatus("Understanding…");
    const intent = resolveKeptIntent(utterance, hub, { includePrivate: true });
    const result = executeKeptCommand(hub, intent.command, { includePrivate: true });
    if (result.ok) {
      await persist(result.hub, result.message);
      setPhase("done");
      if (result.item) setSelected(result.item);
    } else {
      setStatus(result.message);
      setPhase(result.clarify ? "confirm" : "error");
      if (result.clarify?.options?.length) {
        Alert.alert("Kept", result.message, [
          ...result.clarify.options.slice(0, 3).map((option) => ({
            text: option,
            onPress: () => {
              const match = hub.items.find((i) => option.startsWith(i.name));
              if (match) setSelected(match);
            },
          })),
          { text: "Cancel", style: "cancel" },
        ]);
      }
    }
  };

  const startListening = async () => {
    if (!speechOk) {
      setPhase("error");
      setStatus("Speech needs a LifeOS build with recognition. Type below instead.");
      Alert.alert(
        "Microphone",
        "Live listening needs a LifeOS build with speech recognition. Keep typing, or use the iOS keyboard mic.",
      );
      return;
    }
    listenCancelledRef.current = false;
    clearInactivity();
    stopDictation();
    stopRef.current?.();
    setTranscript("");
    setPhase("listening");
    phaseRef.current = "listening";
    setStatus("Listening…");
    bump();
    // Accidental tap: cancel if no transcript activity for ~3s.
    armInactivity();
    const stop = await startDictation({
      onStart: () => {
        if (listenCancelledRef.current) return;
        setPhase("listening");
        phaseRef.current = "listening";
      },
      onResult: (text) => {
        if (listenCancelledRef.current) return;
        armInactivity();
        setTranscript(text);
      },
      onEnd: () => {
        clearInactivity();
        stopRef.current = null;
        if (listenCancelledRef.current) return;
        setTranscript((current) => {
          if (current.trim()) void runUtterance(current);
          else {
            // Empty end = no speech activity (accidental tap / silence).
            setPhase("idle");
            setStatus(KEPT_LISTENING_CANCELED_STATUS);
          }
          return current;
        });
      },
      onError: (message) => {
        clearInactivity();
        if (listenCancelledRef.current) return;
        if (message === "not-allowed") {
          setPhase("error");
          setStatus("Allow microphone access in Settings.");
          Alert.alert("Microphone needed", "Allow speech recognition in Settings to keep by voice.");
          return;
        }
        if (message === "unavailable" || message === "no-speech") {
          setPhase("idle");
          setStatus("Type below — voice unavailable right now.");
          return;
        }
        setPhase("error");
        setStatus(message);
      },
    });
    if (listenCancelledRef.current) {
      stop();
      return;
    }
    stopRef.current = stop;
  };

  const stopListening = () => {
    clearInactivity();
    listenCancelledRef.current = false;
    stopDictation();
    stopRef.current?.();
    stopRef.current = null;
    setPhase((p) => (p === "listening" ? "processing" : p));
  };

  const submitManual = async () => {
    const name = manualName.trim();
    const location = manualLocation.trim();
    if (!name || !location) {
      Alert.alert("Kept", "Object and place are required.");
      return;
    }
    const result = executeKeptCommand(
      hub,
      {
        kind: "SAVE",
        name,
        location,
        notes: manualNotes.trim() || undefined,
        privacy: manualPrivacy,
      },
      { includePrivate: true },
    );
    if (result.ok) {
      await persist(result.hub, result.message);
      setManualOpen(false);
      setManualName("");
      setManualLocation("");
      setManualNotes("");
      setManualPrivacy("normal");
      setPhase("done");
      if (result.item) setSelected(result.item);
    } else Alert.alert("Kept", result.message);
  };

  const updateItem = async (item: KeptItem, patch: Partial<KeptItem>) => {
    const result = executeKeptCommand(
      hub,
      {
        kind: "UPDATE",
        itemId: item.id,
        name: patch.name,
        location: patch.location,
        notes: patch.notes,
        privacy: patch.privacy,
        archived: patch.archived,
        photoUrl: patch.photoUrl === undefined ? undefined : patch.photoUrl || null,
      },
      { includePrivate: true },
    );
    if (result.ok) {
      await persist(result.hub, result.message);
      setSelected(result.item ?? null);
    } else Alert.alert("Kept", result.message);
  };

  const forgetItem = async (item: KeptItem) => {
    const result = executeKeptCommand(hub, { kind: "FORGET", itemId: item.id }, { includePrivate: true });
    if (result.ok) {
      await persist(result.hub, result.message);
      setSelected(null);
    }
  };

  const pickPhoto = async (item: KeptItem) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos", "Allow photo library access to attach a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await updateItem(item, { photoUrl: result.assets[0].uri });
  };

  if (selected) {
    return (
      <Page>
        <ScrollView contentContainerStyle={{ paddingBottom: tabPad + insets.bottom, paddingHorizontal: 16 }}>
        <Pressable onPress={() => setSelected(null)} style={styles.back}>
          <Feather name="arrow-left" size={16} color={theme.muted} />
          <Text style={{ color: theme.muted, fontSize: 13 }}>Back to Kept</Text>
        </Pressable>
        <Title>{selected.name}</Title>
        <Subtitle>
          {selected.location}
          {selected.privacy === "private" ? " · Private" : ""}
        </Subtitle>

        <Field label="Object" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            value={selected.name}
            onChangeText={(name) => setSelected({ ...selected, name })}
            onEndEditing={() => void updateItem(selected, { name: selected.name })}
          />
        </Field>
        <Field label="Location" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            value={selected.location}
            onChangeText={(location) => setSelected({ ...selected, location })}
            onEndEditing={() => void updateItem(selected, { location: selected.location })}
          />
        </Field>
        <Field label="Notes" theme={theme}>
          <TextInput
            style={[styles.input, styles.area, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            value={selected.notes}
            multiline
            onChangeText={(notes) => setSelected({ ...selected, notes })}
            onEndEditing={() => void updateItem(selected, { notes: selected.notes })}
          />
        </Field>

        <Pressable
          onPress={() => void updateItem(selected, { privacy: selected.privacy === "private" ? "normal" : "private" })}
          style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Feather name="lock" size={14} color={theme.accent} />
          <Text style={{ color: theme.text, fontSize: 13 }}>
            {selected.privacy === "private" ? "Private (no Spotlight)" : "Mark private"}
          </Text>
        </Pressable>

        {selected.photoUrl ? (
          <Image source={{ uri: selected.photoUrl }} style={styles.photo} />
        ) : null}
        <Pressable onPress={() => void pickPhoto(selected)} style={[styles.secondaryBtn, { borderColor: theme.border }]}>
          <Feather name="image" size={15} color={theme.text} />
          <Text style={{ color: theme.text, fontWeight: "600" }}>{selected.photoUrl ? "Change photo" : "Add photo"}</Text>
        </Pressable>

        <Text style={[styles.section, { color: theme.text }]}>Location history</Text>
        {selected.locationHistory.length === 0 ? (
          <Text style={{ color: theme.muted, fontSize: 13 }}>No earlier places yet.</Text>
        ) : (
          selected.locationHistory.map((entry) => (
            <View key={`${entry.at}-${entry.location}`} style={styles.historyRow}>
              <Text style={{ color: theme.text, flex: 1 }}>{entry.location}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{new Date(entry.at).toLocaleDateString()}</Text>
            </View>
          ))
        )}

        <View style={styles.rowActions}>
          <Pressable
            onPress={() => void updateItem(selected, { archived: true })}
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
          >
            <Feather name="archive" size={15} color={theme.text} />
            <Text style={{ color: theme.text, fontWeight: "600" }}>Archive</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Forget this?", selected.name, [
                { text: "Cancel", style: "cancel" },
                { text: "Forget", style: "destructive", onPress: () => void forgetItem(selected) },
              ])
            }
            style={[styles.secondaryBtn, { borderColor: "#E07A8A55" }]}
          >
            <Feather name="trash-2" size={15} color="#E07A8A" />
            <Text style={{ color: "#E07A8A", fontWeight: "600" }}>Forget</Text>
          </Pressable>
        </View>
        </ScrollView>
      </Page>
    );
  }

  return (
    <Page>
      <View style={[styles.main, { paddingBottom: tabPad + insets.bottom }]}>
      {/* One title + one subtitle (Calendar-style). No duplicate “Kept” eyebrow. */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Title>Kept</Title>
          <Subtitle>{PAGE_TAGLINE}</Subtitle>
        </View>
        <Pressable
          onPress={() => setManualOpen(true)}
          style={[styles.addBtn, { backgroundColor: theme.accent }]}
          accessibilityLabel="Add kept item"
        >
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={[styles.voiceCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable
          onPress={() => (phase === "listening" ? stopListening() : void startListening())}
          style={[
            styles.mic,
            {
              backgroundColor: phase === "listening" ? "#E07A8A" : theme.accent,
              transform: [{ scale: !reduceMotion && phase === "listening" ? 1.04 : 1 }],
            },
          ]}
          accessibilityLabel={phase === "listening" ? "Stop listening" : "Start listening"}
        >
          <Feather name={speechOk ? "mic" : "mic-off"} size={28} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>{voicePrimary}</Text>
          {voicePhase ? (
            <Text
              style={{
                color: theme.muted,
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                fontWeight: "700",
              }}
            >
              {voicePhase}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Feather name="type" size={15} color={theme.muted} />
        <TextInput
          style={{ flex: 1, color: theme.text, fontSize: 14, paddingVertical: 10 }}
          value={transcript}
          onChangeText={setTranscript}
          placeholder='“keys in the kitchen drawer”'
          placeholderTextColor={theme.muted}
          onSubmitEditing={() => void runUtterance(transcript)}
          returnKeyType="done"
        />
        <Pressable onPress={() => void runUtterance(transcript)} disabled={!transcript.trim()}>
          <Text style={{ color: transcript.trim() ? theme.accent : theme.muted, fontWeight: "700" }}>Go</Text>
        </Pressable>
      </View>

      <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Feather name="search" size={15} color={theme.muted} />
        <TextInput
          style={{ flex: 1, color: theme.text, fontSize: 14, paddingVertical: 10 }}
          value={query}
          onChangeText={setQuery}
          placeholder="Search kept items"
          placeholderTextColor={theme.muted}
        />
      </View>

      {places.length > 0 ? (
        <FlatList
          horizontal
          data={places}
          keyExtractor={(item) => item.location}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setLocationFilter((cur) => (cur === item.location ? null : item.location))}
              style={[
                styles.placeChip,
                {
                  borderColor: locationFilter === item.location ? theme.accent : theme.border,
                  backgroundColor: locationFilter === item.location ? `${theme.accent}22` : theme.surface,
                },
              ]}
            >
              <Feather name="map-pin" size={12} color={theme.muted} />
              <Text style={{ color: theme.text, fontSize: 12 }}>{item.location}</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>{item.count}</Text>
            </Pressable>
          )}
        />
      ) : null}

      {!hydrated ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Feather name="bookmark" size={22} color={theme.muted} />
              <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }}>Nothing kept yet</Text>
              <Text style={{ color: theme.muted, textAlign: "center", fontSize: 13, lineHeight: 18 }}>
                Say or type where something lives — “passport in the blue suitcase”.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }}>
                  {item.name}
                  {item.privacy === "private" ? " 🔒" : ""}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  <Feather name="map-pin" size={11} color={theme.muted} /> {item.location}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.muted} />
            </Pressable>
          )}
        />
      )}

      {manualOpen ? (
        <View style={[styles.sheet, { backgroundColor: theme.bg, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHead}>
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 16 }}>Keep something</Text>
            <Pressable onPress={() => setManualOpen(false)}>
              <Feather name="x" size={20} color={theme.muted} />
            </Pressable>
          </View>
          <Field label="Object" theme={theme}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              value={manualName}
              onChangeText={setManualName}
              placeholder="Keys, passport…"
              placeholderTextColor={theme.muted}
              autoFocus
            />
          </Field>
          <Field label="Location" theme={theme}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              value={manualLocation}
              onChangeText={setManualLocation}
              placeholder="Kitchen drawer…"
              placeholderTextColor={theme.muted}
            />
          </Field>
          <Field label="Notes" theme={theme}>
            <TextInput
              style={[styles.input, styles.area, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              value={manualNotes}
              onChangeText={setManualNotes}
              multiline
              placeholderTextColor={theme.muted}
            />
          </Field>
          <Pressable
            onPress={() => setManualPrivacy((p) => (p === "private" ? "normal" : "private"))}
            style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Feather name={manualPrivacy === "private" ? "check-square" : "square"} size={16} color={theme.accent} />
            <Text style={{ color: theme.text, fontSize: 13 }}>Private (exclude from Spotlight)</Text>
          </Pressable>
          <Pressable onPress={() => void submitManual()} style={[styles.primaryBtn, { backgroundColor: theme.accent }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Keep</Text>
          </Pressable>
        </View>
      ) : null}
      </View>
    </Page>
  );
}

function Field({
  label,
  children,
  theme,
}: {
  label: string;
  children: ReactNode;
  theme: { muted: string };
}) {
  return (
    <View style={{ gap: 6, marginTop: 12 }}>
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Match Calendar hub padding (header paddingHorizontal: 20, paddingTop: 8).
  main: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12, paddingTop: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  // Border language matches Calendar panels (upcomingRow / readyRow): solid theme.border, 1px, radius 14.
  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
  },
  mic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  placeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
  },
  empty: {
    marginTop: 24,
    padding: 28,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    gap: 8,
  },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  area: { minHeight: 72, textAlignVertical: "top" },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  photo: { width: "100%", height: 180, borderRadius: 12, marginTop: 12 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  section: { fontWeight: "700", fontSize: 14, marginTop: 18, marginBottom: 8 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 6 },
  rowActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
});
