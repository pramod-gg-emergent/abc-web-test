import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";
import { getCurrencySymbol } from "@/src/format";

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY"];

export default function SettingsScreen() {
  const [currency, setCurrency] = useState("USD");
  const [limit, setLimit] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await api.getBudget();
      setCurrency(b.currency || "USD");
      setLimit(b.weekly_limit ? String(b.weekly_limit) : "");
    } catch (e) {
      console.warn("settings load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    const num = parseFloat(limit);
    if (Number.isNaN(num) || num < 0) {
      return;
    }
    setSaving(true);
    try {
      await api.setBudget({ weekly_limit: num, currency });
      setSavedAt(Date.now());
    } catch (e) {
      console.warn("save failed", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderWrap} edges={["top"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>YOUR SETUP</Text>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly budget limit</Text>
          <Text style={styles.cardSubtitle}>
            We will warn you when you are nearing or over this limit.
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>
              {getCurrencySymbol(currency)}
            </Text>
            <TextInput
              value={limit}
              onChangeText={setLimit}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              testID="weekly-limit-input"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Currency</Text>
          <Text style={styles.cardSubtitle}>
            Used for display only — your data stays the same.
          </Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={[
                  styles.currencyChip,
                  currency === c && styles.currencyChipActive,
                ]}
                testID={`currency-${c}`}
              >
                <Text
                  style={[
                    styles.currencyChipText,
                    currency === c && styles.currencyChipTextActive,
                  ]}
                >
                  {getCurrencySymbol(c)} {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={save}
          disabled={saving}
          testID="save-settings-btn"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveText}>Save changes</Text>
            </>
          )}
        </TouchableOpacity>

        {savedAt && !saving && (
          <Text style={styles.savedToast} testID="saved-toast">
            Saved ✓
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Expense Tracker · v1.0{"\n"}Made with care for your wallet.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loaderWrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  currencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  currencyChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  currencyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  currencyChipTextActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  savedToast: {
    textAlign: "center",
    marginTop: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  footer: { alignItems: "center", marginTop: spacing.xl },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
