import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { redeemPromoCode, type Entitlement } from "../lib/entitlement";
import {
  SUBSCRIPTION_CANCEL_INSTRUCTIONS,
  SUBSCRIPTION_OFFERS,
  SUBSCRIPTION_RENEWAL_TERMS,
} from "../../../lib/legal/subscriptionTerms";
import { useLifeOS } from "../lib/LifeOSContext";

type Props = {
  onUnlock: (entitlement: Entitlement) => void;
  onClose?: () => void;
};

/** Full-screen paywall for paid hubs (Work, Mastery, etc.). Home + School stay free. */
export function PaywallGate({ onUnlock, onClose }: Props) {
  const { theme } = useLifeOS();
  const insets = useSafeAreaInsets();
  const [promo, setPromo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const applyPromo = () => {
    setBusy(true);
    setError("");
    const result = redeemPromoCode(promo);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUnlock(result.entitlement);
  };

  const subscribe = (offerId: string) => {
    setNote(
      "App Store products activate when LifeOS Pro is live in App Store Connect. Until then, redeem a valid promo code if you have one.",
    );
    void offerId;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headRow}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>LifeOS Pro</Text>
          {onClose ? (
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ color: theme.muted, fontWeight: "700" }}>Not now</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Unlock more hubs</Text>
        <Text style={[styles.lead, { color: theme.muted }]}>
          Home and School stay free. Pro unlocks Work and other paid hubs.
        </Text>

        <View style={styles.offers}>
          {SUBSCRIPTION_OFFERS.map((offer) => (
            <Pressable
              key={offer.id}
              onPress={() => subscribe(offer.id)}
              style={[styles.offer, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.offerTitle, { color: theme.text }]}>{offer.label}</Text>
              <Text style={[styles.offerPrice, { color: theme.accent }]}>{offer.priceLabel}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.legal, { color: theme.muted }]}>
          <Text style={{ fontWeight: "800", color: theme.text }}>Renewal. </Text>
          {SUBSCRIPTION_RENEWAL_TERMS}
        </Text>
        <Text style={[styles.legal, { color: theme.muted }]}>
          <Text style={{ fontWeight: "800", color: theme.text }}>Cancel. </Text>
          {SUBSCRIPTION_CANCEL_INSTRUCTIONS}
        </Text>
        {note ? <Text style={[styles.note, { color: theme.muted }]}>{note}</Text> : null}

        <Text style={[styles.label, { color: theme.muted }]}>Promo code</Text>
        <View style={styles.promoRow}>
          <TextInput
            value={promo}
            onChangeText={(value) => {
              setPromo(value);
              if (error) setError("");
            }}
            placeholder="Enter promo code"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            onSubmitEditing={applyPromo}
          />
          <Pressable
            onPress={applyPromo}
            disabled={busy || !promo.trim()}
            style={[styles.redeem, { backgroundColor: theme.accent, opacity: busy || !promo.trim() ? 0.5 : 1 }]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.redeemText}>Redeem</Text>}
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void Linking.openURL("https://lifeos.app/legal/dmca").catch(() => undefined)}
          style={styles.linkRow}
        >
          <Feather name="shield" size={14} color={theme.muted} />
          <Text style={{ color: theme.muted, fontSize: 12 }}>Legal</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingBottom: 40, gap: 10 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  offers: { gap: 10, marginTop: 8 },
  offer: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 4 },
  offerTitle: { fontSize: 16, fontWeight: "800" },
  offerPrice: { fontSize: 14, fontWeight: "700" },
  legal: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 14 },
  promoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  redeem: { height: 46, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  redeemText: { color: "#fff", fontWeight: "800" },
  error: { color: "#c65048", fontSize: 13, fontWeight: "700" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18 },
});
