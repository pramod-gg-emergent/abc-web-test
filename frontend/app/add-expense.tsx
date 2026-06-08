import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import {
  CATEGORIES,
  CATEGORY_META,
  Category,
  colors,
  radius,
  spacing,
} from "@/src/theme";
import { getCurrencySymbol, todayISO } from "@/src/format";

export default function AddExpenseScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getBudget().then((b) => setCurrency(b.currency || "USD")).catch(() => {});
  }, []);

  const canSubmit = parseFloat(amount) > 0 && !submitting;

  const submit = async () => {
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createExpense({
        amount: num,
        category,
        note,
        date: todayISO(),
      });
      router.back();
    } catch (e: any) {
      console.warn("create failed", e);
      setError("Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          testID="close-add-expense"
        >
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>New expense</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={100}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.amountLabel}>How much?</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>
            {getCurrencySymbol(currency)}
          </Text>
          <TextInput
            value={amount}
            onChangeText={(t) => {
              // Allow digits and one decimal
              const cleaned = t.replace(/[^0-9.]/g, "");
              const parts = cleaned.split(".");
              if (parts.length > 2) return;
              setAmount(cleaned);
            }}
            placeholder="0"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            autoFocus
            style={styles.amountInput}
            testID="amount-input"
          />
        </View>

        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            const meta = CATEGORY_META[c];
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.catChip,
                  active && {
                    backgroundColor: meta.color + "15",
                    borderColor: meta.color,
                  },
                ]}
                testID={`category-chip-${c.toLowerCase()}`}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={18}
                  color={active ? meta.color : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.catChipText,
                    active && { color: meta.color, fontWeight: "700" },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Lunch with team"
          placeholderTextColor={colors.textSecondary}
          style={styles.noteInput}
          maxLength={120}
          testID="note-input"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!canSubmit}
          testID="submit-expense-btn"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.submitText}>Save expense</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  amountLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 64,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -2,
    minWidth: 80,
    textAlign: "center",
    padding: 0,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: {
    color: colors.warning,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
