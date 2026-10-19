import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

/** Catches Career hub render failures so a bad blob cannot take down the whole app. */
export class CareerErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[LifeOS] Career screen crashed", error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <CareerCrashFallback message={this.state.error.message} onRetry={this.reset} />;
  }
}

function CareerCrashFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useLifeOS();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Career hit a snag</Text>
      <Text style={[styles.body, { color: theme.muted }]}>
        Your other hubs are fine. Try again, or reopen Career after the next update.
      </Text>
      {message ? (
        <Text style={[styles.detail, { color: theme.muted }]} numberOfLines={3}>
          {message}
        </Text>
      ) : null}
      <Pressable
        onPress={onRetry}
        style={[styles.btn, { backgroundColor: theme.accent }]}
        accessibilityRole="button"
        accessibilityLabel="Retry Career"
      >
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 20, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 20 },
  detail: { fontSize: 11, marginTop: 4 },
  btn: { marginTop: 12, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
