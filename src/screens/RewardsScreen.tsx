import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopBar, Card, Button, InteractiveBarChart } from '../components';
import { useAppState } from '../state/AppState';
import { colors, typography, spacing, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function RewardsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { totalCredits, todayCredits, completions } = useAppState();
  const [showPayout, setShowPayout] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Build sponsor earnings from completions
  const sponsorMap = new Map<string, { amount: number; count: number }>();
  for (const c of completions) {
    const prev = sponsorMap.get(c.sponsor) ?? { amount: 0, count: 0 };
    const earned = parseFloat(c.credits.replace('+', '')) || 0;
    sponsorMap.set(c.sponsor, { amount: prev.amount + earned, count: prev.count + 1 });
  }
  const sponsorEarnings = Array.from(sponsorMap.entries())
    .map(([sponsor, data]) => ({ sponsor, amount: data.amount.toFixed(2), routines: data.count }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

  // Weekly earnings — last 7 days ending today, computed from real completions
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weeklyEarnings = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const dayCredits = completions
      .filter((c) => c.timestamp >= dayStart && c.timestamp < dayEnd)
      .reduce((sum, c) => sum + (parseFloat(c.credits.replace('+', '')) || 0), 0);
    weeklyEarnings.push({
      label: DAY_LABELS[d.getDay()],
      amount: dayCredits,
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  const isEmpty = completions.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Rewards" onAvatarPress={() => navigation.navigate('Profile')} onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {/* Balance */}
        <View style={[styles.balanceCard, shadows.diffuse]}>
          <MaterialIcons name="stars" size={32} color={colors.tertiary} />
          <View style={styles.balanceRow}>
            <Text style={[typography.display, { color: colors.tertiary }]}>
              {totalCredits.toFixed(2)}
            </Text>
            <Text style={[typography.labelLg, { color: colors.tertiaryContainer }]}>Credits</Text>
          </View>
          <View style={styles.balanceStats}>
            <View style={styles.stat}>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>Today</Text>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                +{todayCredits.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>All Time</Text>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                {totalCredits.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <Button
          label={showPayout ? 'Payout coming soon' : 'View Payout Options'}
          variant="secondary"
          onPress={() => setShowPayout(!showPayout)}
        />
        {showPayout && (
          <Card style={{ padding: 16 }}>
            <View style={styles.payoutRow}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
                Rewards are distributed through x402-compatible crypto payment rails
                to your Solana Seeker wallet.
              </Text>
            </View>
          </Card>
        )}

        {isEmpty ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="payments" size={48} color={colors.outlineVariant} />
            <Text style={[typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>
              No earnings yet
            </Text>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Complete a routine to start earning credits from sponsors.
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
            {/* Weekly Earnings Chart */}
            <View style={styles.section}>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                Weekly Earnings
              </Text>
              <Card>
                <InteractiveBarChart
                  data={weeklyEarnings.map((d) => ({ label: d.label, value: d.amount, date: d.date }))}
                  barColor={colors.tertiaryFixedDim}
                  activeBarColor={colors.tertiary}
                  formatDetail={(item) =>
                    item.value > 0
                      ? `+${item.value.toFixed(2)} credits earned`
                      : 'No earnings'
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

            {/* By Sponsor */}
            {sponsorEarnings.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.headlineMd, { color: colors.onSurface }]}>By Sponsor</Text>
                <View style={[styles.sponsorList, shadows.diffuse]}>
                  {sponsorEarnings.map((item, i) => (
                    <View key={item.sponsor}>
                      {i > 0 && <View style={styles.divider} />}
                      <View style={styles.sponsorRow}>
                        <MaterialIcons name="verified" size={18} color={colors.primary} />
                        <View style={styles.sponsorInfo}>
                          <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                            {item.sponsor}
                          </Text>
                          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                            {item.routines} verified {item.routines === 1 ? 'use' : 'uses'}
                          </Text>
                        </View>
                        <View style={styles.earnBadge}>
                          <MaterialIcons name="stars" size={12} color={colors.tertiary} />
                          <Text style={[typography.labelSm, { color: colors.tertiary }]}>
                            +{item.amount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Sponsor Note */}
        <Card
          accentColor={colors.primary}
          style={{ padding: 16 }}
          onPress={() => navigation.navigate('Sponsors')}
        >
          <View style={styles.noteRow}>
            <MaterialIcons name="handshake" size={20} color={colors.primary} />
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
              Credits are funded by the brands whose products you verify. Learn how it works.
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.marginPage, paddingBottom: 120, gap: spacing.stackLg },
  balanceCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackLg,
    marginTop: spacing.stackSm,
  },
  stat: { alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.outlineVariant },
  payoutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.stackMd,
  },
  section: { gap: spacing.stackSm },
  sponsorList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sponsorInfo: { flex: 1, gap: 2 },
  earnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,222,169,0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
