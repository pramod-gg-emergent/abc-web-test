import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api, WeekSummary } from "@/src/api";
import { CATEGORY_META, colors, radius, spacing } from "@/src/theme";
import { formatDayShort, formatMoney } from "@/src/format";

export default function StatsScreen() {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.weekSummary();
      setSummary(s);
    } catch (e) {
      console.warn("stats load failed", e);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading && !summary) {
    return (
      <SafeAreaView style={styles.loaderWrap} edges={["top"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const total = summary?.total ?? 0;
  const currency = summary?.currency ?? "USD";
  const byDay = summary?.by_day ?? {};
  const byCategory = summary?.by_category ?? {};
  const maxDay = Math.max(1, ...Object.values(byDay));
  const categoriesSorted = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.eyebrow}>WEEKLY BREAKDOWN</Text>
        <Text style={styles.title}>Stats</Text>

        <View style={styles.card} testID="daily-chart-card">
          <Text style={styles.cardTitle}>Daily spend</Text>
          <Text style={styles.cardSubtitle}>
            Total · {formatMoney(total, currency)}
          </Text>
          <View style={styles.chart}>
            {Object.entries(byDay).map(([day, value]) => {
              const h = Math.max(4, (value / maxDay) * 120);
              return (
                <View key={day} style={styles.barCol}>
                  <View style={styles.barWrap}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: h,
                          backgroundColor:
                            value > 0 ? colors.primary : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{formatDayShort(day)}</Text>
                  <Text style={styles.barValue}>
                    {value > 0
                      ? formatMoney(value, currency).replace(
                          /(\..*)?$/,
                          (m) => (value >= 1000 ? "" : m),
                        )
                      : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card} testID="category-breakdown-card">
          <Text style={styles.cardTitle}>By category</Text>
          {categoriesSorted.length === 0 ? (
            <View style={styles.emptyCat}>
              <Ionicons
                name="pie-chart-outline"
                size={36}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyCatText}>
                No category data yet this week.
              </Text>
            </View>
          ) : (
            categoriesSorted.map(([cat, value]) => {
              const meta =
                CATEGORY_META[cat as keyof typeof CATEGORY_META] ??
                CATEGORY_META.Others;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catHeader}>
                    <View
                      style={[
                        styles.catDot,
                        { backgroundColor: meta.color },
                      ]}
                    />
                    <Text style={styles.catName}>{cat}</Text>
                    <Text style={styles.catAmount}>
                      {formatMoney(value, currency)}
                    </Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View
                      style={[
                        styles.catFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: meta.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.catPct}>{pct.toFixed(0)}% of total</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    marginTop: 6,
  },
  barCol: { flex: 1, alignItems: "center" },
  barWrap: {
    height: 130,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: { width: 14, borderRadius: 7 },
  barLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "500",
  },
  barValue: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: "600",
    marginTop: 2,
  },
  catRow: { marginBottom: spacing.md },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  catTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    marginBottom: 4,
  },
  catFill: { height: "100%", borderRadius: 3 },
  catPct: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  emptyCat: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyCatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
