import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeWallet } from '../services/wallet';
import { BackHeader, Card, Button } from '../components';
import { useAppState } from '../state/AppState';
import { resolveSkrName } from '../services/skrIdentity';
import { colors, typography, spacing, shadows } from '../theme';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { SOLANA_EXPLORER_CLUSTER_PARAM } from '../config/solana';
import { ROUTINES } from '../data/routines';
import { openExternalUrl } from '../utils/link';

const AVATAR_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB4Wp9jo7afnvOrefyamvjTEJvxS9f_stKJRdSbratM6o2_bgcLViDjREsBei4gcRQygRTvH3cDhB-AFJkzWpJsxoPwjMwLdEg5bHb2irRoA333SwBfCX7EljI-goFpQiQSv2H1P28DbyaKO9UCUA3IGRQXZndTBfftH1Z4hUOejN4eltV6q8bdhtNjxA_ZO-D3gBLv2vl4v5_yvU1HdtD2EX8PAXQGU8G2t1XBNTre2jImRztpMELHhBrAfs-yKKdw48cst8KIt1Gq';

// Derive the sponsor list from the actual routine data so it stays in sync.
const SPONSORS = Array.from(
  new Set(
    ROUTINES.map((r) => r.sponsorName).filter(
      (name): name is string => typeof name === 'string' && name.length > 0
    )
  )
);

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { account, disconnect } = useSafeWallet();
  const { completions, totalCredits, streak } = useAppState();
  const [skrName, setSkrName] = useState<string | null>(null);
  const [isResolvingSkr, setIsResolvingSkr] = useState(false);

  const walletAddress = account?.address ? account.address.toString() : null;
  const accountLabel = account?.label;
  const seekerIdFromWallet = accountLabel?.endsWith('.skr') ? accountLabel : null;
  const displayIdentity = seekerIdFromWallet ?? skrName;
  const displayName = displayIdentity ?? (walletAddress ? truncateAddress(walletAddress) : 'Not Connected');

  useEffect(() => {
    let cancelled = false;

    if (!walletAddress || seekerIdFromWallet?.endsWith('.skr')) {
      setSkrName(null);
      setIsResolvingSkr(false);
      return;
    }

    setSkrName(null);
    setIsResolvingSkr(true);
    resolveSkrName(walletAddress).then((name) => {
      if (cancelled) return;
      setSkrName(name);
      setIsResolvingSkr(false);
    });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, seekerIdFromWallet]);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      );
    } catch {
      // Already disconnected
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      );
    }
  };

  const openWalletExplorer = () => {
    if (!walletAddress) return;
    openExternalUrl(
      `https://explorer.solana.com/address/${walletAddress}?cluster=${SOLANA_EXPLORER_CLUSTER_PARAM}`
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Profile" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
          </View>
          <View style={styles.identityRow}>
            <Text style={[typography.headlineLg, { color: colors.onSurface }]}>
              {isResolvingSkr ? 'Looking up Seeker ID...' : displayName}
            </Text>
            {walletAddress && (
              <Pressable
                onPress={openWalletExplorer}
                hitSlop={10}
                style={({ pressed }) => [styles.headerExplorerButton, pressed && styles.explorerRowPressed]}
                accessibilityRole="link"
                accessibilityLabel="Open wallet in Solana Explorer"
              >
                <MaterialIcons name="open-in-new" size={18} color={colors.primary} />
              </Pressable>
            )}
          </View>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
            {displayIdentity && walletAddress ? truncateAddress(walletAddress) : 'Member since April 2026'}
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsCard, shadows.diffuse]}>
          <StatItem label="Completed" value={String(completions.length)} />
          <View style={styles.statDivider} />
          <StatItem label="Earned" value={totalCredits.toFixed(2)} />
          <View style={styles.statDivider} />
          <StatItem label="Streak" value={String(streak)} />
        </View>

        {/* Wallet */}
        <View style={styles.section}>
          <Text style={[typography.headlineMd, { color: colors.onSurface }]}>Wallet</Text>
          <Card>
            <View style={styles.walletRow}>
              <MaterialIcons name="account-balance-wallet" size={24} color={colors.primary} />
              <View style={styles.walletInfo}>
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                  Solana Wallet
                </Text>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                  {walletAddress
                    ? `Connected · ${displayIdentity ?? truncateAddress(walletAddress)}`
                    : 'Not connected'}
                </Text>
                {displayIdentity && walletAddress && (
                  <Text style={[typography.labelSm, { color: colors.outline }]}>
                    {truncateAddress(walletAddress)}
                  </Text>
                )}
              </View>
              {walletAddress ? (
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
              ) : (
                <MaterialIcons name="error-outline" size={20} color={colors.outline} />
              )}
            </View>
          </Card>
        </View>

        {/* Sponsors */}
        <View style={styles.section}>
          <Text style={[typography.headlineMd, { color: colors.onSurface }]}>Active Sponsors</Text>
          <View style={[styles.sponsorList, shadows.diffuse]}>
            {SPONSORS.map((name, i) => (
              <View key={name}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.sponsorRow}>
                  <MaterialIcons name="verified" size={18} color={colors.primary} />
                  <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{name}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Disconnect */}
        <Button
          label="Disconnect Wallet"
          variant="secondary"
          onPress={handleDisconnect}
          icon={<MaterialIcons name="logout" size={18} color={colors.primary} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[typography.headlineLg, { color: colors.primary }]}>{value}</Text>
      <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.marginPage, paddingBottom: 40, gap: spacing.stackLg },
  header: { alignItems: 'center', gap: spacing.stackSm, paddingVertical: spacing.stackMd },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  avatar: { width: 80, height: 80 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.outlineVariant },
  section: { gap: spacing.stackSm },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletInfo: { flex: 1, gap: 2 },
  explorerRowPressed: { opacity: 0.7 },
  sponsorList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerExplorerButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFixed,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
