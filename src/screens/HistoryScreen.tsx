import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopBar, Card, Button, VideoThumb, InteractiveBarChart } from '../components';
import { useAppState } from '../state/AppState';
import { formatCompletionTime } from '../utils/time';
import { colors, typography, spacing, shadows } from '../theme';
import type { RootStackParamList, CompletionData } from '../navigation/types';

const INITIAL_COUNT = 5;

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { completions, streak, showVideoThumbnails } = useAppState();
  const [showCount, setShowCount] = useState(INITIAL_COUNT);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const visible = completions.slice(0, showCount);
  const hasMore = showCount < completions.length;
  const thisWeekCount = completions.length; // simplified — real app would filter by date

  // Build daily activity from completions
  const dailyBars = buildDailyBars(completions);

  const isEmpty = completions.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="History" onAvatarPress={() => navigation.navigate('Profile')} onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={48} color={colors.outlineVariant} />
            <Text style={[typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>
              No activity yet
            </Text>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Complete your first routine to start building your history.
            </Text>
            <Button
              label="Browse Routines"
              onPress={() => navigation.navigate('Main', { screen: 'Routines' })}
              icon={<MaterialIcons name="event-repeat" size={18} color={colors.onPrimary} />}
              style={{ marginTop: spacing.stackSm }}
            />
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={[styles.summaryCard, shadows.diffuse]}>
              <SummaryItem label="This Week" value={String(thisWeekCount)} />
              <View style={styles.summaryDivider} />
              <SummaryItem label="All Time" value={String(completions.length)} />
              <View style={styles.summaryDivider} />
              <SummaryItem label="Streak" value={String(streak)} />
            </View>

            {/* Daily Activity Chart */}
            {dailyBars.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                  Daily Activity
                </Text>
                <Card>
                  <InteractiveBarChart
                    data={dailyBars.map((d) => ({ label: d.label, value: d.count, date: d.date }))}
                    barColor={colors.primaryFixedDim}
                    activeBarColor={colors.primary}
                    formatDetail={(item) =>
                      `${item.value} ${item.value === 1 ? 'routine' : 'routines'} completed`
                    }
                    onScrubStart={() => {
                      setScrollEnabled(false);
                    }}
                    onScrubEnd={() => {
                      setScrollEnabled(true);
                    }}
                  />
                </Card>
              </View>
            )}

            {/* Timeline */}
            <View style={styles.section}>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                Recent Activity
              </Text>
              <View style={[styles.list, shadows.diffuse]}>
                {visible.map((item, i) => (
                  <View key={i}>
                    {i > 0 && <View style={styles.divider} />}
                    <Pressable
                      onPress={() => navigation.navigate('CompletionDetail', { completion: item })}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      {showVideoThumbnails && item.videoUri ? (
                        <VideoThumb videoUri={item.videoUri} size={44} />
                      ) : (
                        <View style={styles.rowIcon}>
                          <MaterialIcons name={item.icon as any} size={20} color={colors.primary} />
                        </View>
                      )}
                      <View style={styles.rowInfo}>
                        <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                          {item.task}
                        </Text>
                        <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                          {formatCompletionTime(item.timestamp)} · {item.sponsor}
                        </Text>
                      </View>
                      {item.selfVerified ? (
                        <View style={styles.selfChip}>
                          <MaterialIcons name="person" size={12} color={colors.onSurfaceVariant} />
                          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                            Self
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.creditChip}>
                          <MaterialIcons name="stars" size={12} color={colors.tertiary} />
                          <Text style={[typography.labelSm, { color: colors.tertiary }]}>
                            {item.credits}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
              {hasMore && (
                <Button
                  label={`View Older (${completions.length - showCount} more)`}
                  variant="secondary"
                  onPress={() => setShowCount(completions.length)}
                  style={styles.olderBtn}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[typography.headlineLg, { color: colors.primary }]}>{value}</Text>
      <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildDailyBars(completions: CompletionData[]) {
  if (completions.length === 0) return [];

  const today = new Date();
  const bars: { label: string; count: number; date: string }[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;

    const count = completions.filter(
      (c) => c.timestamp >= dayStart && c.timestamp < dayEnd
    ).length;

    bars.push({
      label: DAY_LABELS[d.getDay()],
      count,
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  return bars;
}

// ── Styles ──

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.marginPage, paddingBottom: 120, gap: spacing.stackLg },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: spacing.stackMd,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.outlineVariant },
  section: { gap: spacing.stackSm },
  list: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: colors.surfaceContainerLow },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 2 },
  creditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,222,169,0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  selfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  olderBtn: { borderRadius: 9999 },
});
