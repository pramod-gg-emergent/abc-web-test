import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { api, Expense, WeekSummary, alertStore } from "@/src/api";
import { CATEGORY_META, colors, radius, spacing } from "@/src/theme";
import { formatLongDate, formatMoney } from "@/src/format";

export default function HomeScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<null | {
    level: "80" | "100";
    message: string;
  }>(null);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        api.weekSummary(),
        api.listExpenses(),
      ]);
      setSummary(s);
      setExpenses(list);
      // Limit alert logic
      if (s.weekly_limit > 0) {
        const overLimit = s.over_limit;
        const near = s.percent_used >= 80 && !overLimit;
        if (overLimit) {
          if (await alertStore.shouldShow(s.week_start, "100")) {
            setBanner({
              level: "100",
              message: `You're over your weekly limit by ${formatMoney(
                s.total - s.weekly_limit,
                s.currency,
              )}.`,
            });
          }
        } else if (near) {
          if (await alertStore.shouldShow(s.week_start, "80")) {
            setBanner({
              level: "80",
              message: `You've used ${s.percent_used}% of your weekly limit. Slow down a bit?`,
            });
          }
        }
      }
    } catch (e) {
      console.warn("load home failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onDismissBanner = async () => {
    if (banner && summary) {
      await alertStore.markShown(summary.week_start, banner.level);
    }
    setBanner(null);
  };

  const onDelete = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.deleteExpense(id);
      load();
    } catch (e) {
      console.warn("delete failed", e);
      load();
    }
  };

  if (loading && !summary) {
    return (
      <SafeAreaView style={styles.loaderWrap} edges={["top"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const total = summary?.total ?? 0;
  const limit = summary?.weekly_limit ?? 0;
  const currency = summary?.currency ?? "USD";
  const pct = summary?.percent_used ?? 0;
  const progressWidth = Math.min(100, pct);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header} testID="home-header">
              <View>
                <Text style={styles.helloEyebrow}>THIS WEEK</Text>
                <Text style={styles.helloTitle}>Your spending</Text>
              </View>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => router.push("/(tabs)/settings")}
                testID="header-settings-btn"
              >
                <Ionicons
                  name="person-circle-outline"
                  size={32}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            {banner && (
              <View
                style={[
                  styles.banner,
                  banner.level === "100"
                    ? styles.bannerDanger
                    : styles.bannerWarn,
                ]}
                testID="limit-banner"
              >
                <Ionicons
                  name={
                    banner.level === "100"
                      ? "alert-circle"
                      : "warning-outline"
                  }
                  size={20}
                  color={colors.warning}
                />
                <Text style={styles.bannerText}>{banner.message}</Text>
                <TouchableOpacity
                  onPress={onDismissBanner}
                  testID="dismiss-banner"
                >
                  <Ionicons name="close" size={18} color={colors.warning} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.totalCard} testID="weekly-total-card">
              <Text style={styles.totalLabel}>Spent this week</Text>
              <Text style={styles.totalAmount} testID="weekly-total-text">
                {formatMoney(total, currency)}
              </Text>
              {limit > 0 ? (
                <>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressWidth}%`,
                          backgroundColor:
                            pct >= 100
                              ? colors.warning
                              : pct >= 80
                                ? "#E8A23B"
                                : "rgba(255,255,255,0.85)",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.totalSubtext}>
                    {formatMoney(limit, currency)} weekly limit ·{" "}
                    {pct.toFixed(0)}% used
                  </Text>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/settings")}
                  style={styles.setLimitBtn}
                  testID="set-limit-cta"
                >
                  <Text style={styles.setLimitText}>
                    Set a weekly limit →
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Recent transactions</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty} testID="empty-state">
            <Ionicons
              name="receipt-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to log your first expense.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            currency={currency}
            onDelete={() => onDelete(item.id)}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/add-expense")}
        testID="add-expense-fab"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ExpenseRow({
  expense,
  currency,
  onDelete,
}: {
  expense: Expense;
  currency: string;
  onDelete: () => void;
}) {
  const meta =
    CATEGORY_META[expense.category as keyof typeof CATEGORY_META] ??
    CATEGORY_META.Others;
  return (
    <View style={styles.row} testID={`expense-row-${expense.id}`}>
      <View
        style={[styles.rowIcon, { backgroundColor: meta.color + "22" }]}
      >
        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rowCategory}>{expense.category}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatLongDate(expense.date)}
          {expense.note ? ` · ${expense.note}` : ""}
        </Text>
      </View>
      <Text style={styles.rowAmount}>
        −{formatMoney(expense.amount, currency)}
      </Text>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={10}
        style={styles.rowDelete}
        testID={`delete-${expense.id}`}
      >
        <Ionicons
          name="trash-outline"
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  helloEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  helloTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileBtn: { padding: 4 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.input,
    padding: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  bannerWarn: {
    backgroundColor: "#FFF3DC",
    borderColor: "#E8A23B66",
  },
  bannerDanger: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + "55",
  },
  bannerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  totalLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  totalAmount: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: spacing.md,
  },
  totalSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  setLimitBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 10,
    borderRadius: radius.button,
    alignItems: "center",
  },
  setLimitText: { color: "#fff", fontWeight: "600" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowMid: { flex: 1 },
  rowCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowMeta: { fontSize: 12, color: colors.textSecondary },
  rowAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: 8,
  },
  rowDelete: { padding: 4 },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
