import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches render failures so one screen cannot take down the whole app. */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[LifeOS] Root tree crashed", error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          LifeOS hit an unexpected error. You can try again without force-quitting.
        </Text>
        {this.state.error.message ? (
          <Text style={styles.detail} numberOfLines={4}>
            {this.state.error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={this.reset}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 10,
    backgroundColor: "#111115",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#F5F5F7" },
  body: { fontSize: 14, lineHeight: 20, color: "#A1A1AA" },
  detail: { fontSize: 11, marginTop: 4, color: "#71717A" },
  btn: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#3B82F6",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
