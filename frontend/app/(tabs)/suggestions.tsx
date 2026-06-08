import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api, SuggestionsResponse } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function SuggestionsScreen() {
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.suggestions();
      setData(res);
    } catch (e: any) {
      console.warn("suggestions failed", e);
      setError("Couldn't load suggestions. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!data) load();
    }, [data, load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

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
        <Text style={styles.eyebrow}>AI COACH</Text>
        <Text style={styles.title}>Smart suggestions</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <Text style={styles.heroText}>
            {loading
              ? "Analyzing your weekly spend…"
              : data?.summary ||
                "Tap refresh to get personalized money tips."}
          </Text>
        </View>

        {loading && !data ? (
          <View style={styles.loadingWrap} testID="suggestions-loading">
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>
              Brewing tailored tips just for you…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={colors.warning}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={load}
              style={styles.retryBtn}
              testID="retry-suggestions"
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {data?.suggestions.map((s, i) => (
              <View
                key={i}
                style={styles.tipCard}
                testID={`suggestion-card-${i}`}
              >
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>{i + 1}</Text>
                </View>
                <View style={styles.tipBody}>
                  <Text style={styles.tipTitle}>{s.title}</Text>
                  <Text style={styles.tipDesc}>{s.body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={load}
          disabled={loading}
          testID="refresh-suggestions"
        >
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.refreshText}>Generate fresh tips</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  list: { gap: 12 },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  tipNumberText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  tipBody: { flex: 1 },
  tipTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  errorCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: radius.button,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});
