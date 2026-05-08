import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BackHeader, Card, Button } from '../components';
import { colors, typography, spacing, shadows } from '../theme';
import { openExternalUrl } from '../utils/link';

const HERO_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC9zEPTKcVJktM00V02DhGpNov8zNAlUdnWCiBSwWv6viOrN1ftMIpiiHUt6uoSvJB8ARylod0Iqye8NopIpTbryw5qXYqtLmb4nCV0esUCD4FC8HpGRVg5OGCazrNOeHtbCd-offfKYyWb9huexzb40_fiPYyXT7XhHQKxPBgcsrpQe5N3e6J9Vztoho15Sm01GUIEPDcq6VfjfHM5Sauu7bxRjfb2N1E1c4YnAwNs0kceBuyIzdaJXJnPQg-u3-0PG4801lmIjnVs';

const LOGO_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCLOL7Bw9LFFZ8fA7geQ5tjoqN_hSbNtEFHJKNewYyc9Ff4PPjpbmwK9VdZw0BRK9HPyaM4JMmRkpONHqBb96ntEynhaO29lVSg8bs8Xk1MXjZ3tR_20nyOJhSC0NuNwaoi4QRASD3Vlf3qc-4-moIeni5p_dpN7kY_zObRV-oV6jps6j5ss4Hp18Yqqfk2D-gLMP6P0uzScT_jYsdkyEnUKEkOXgPmSO1BvmoY28WpotmoOqJkIXdbDGhUmqGCoOfGOUkFTPZrTxs3';

export function SponsorsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="About our Sponsors" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, shadows.soft]}>
          <Image source={{ uri: HERO_URI }} style={styles.heroBg} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <MaterialIcons name="handshake" size={30} color={colors.primary} />
            </View>
            <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
              Building Habits Together
            </Text>
          </View>
        </View>

        {/* Narrative */}
        <View style={styles.narrative}>
          <Text style={[typography.bodyLg, { color: colors.onSurface }]}>
            Sponsors help us provide credits for your routines, making it easier
            to build lasting habits. Their support allows Rhythm to remain
            accessible while rewarding you for your consistency.
          </Text>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
            Verification is powered by Amazon Nova 2 Lite on AWS Bedrock.
            Rewards are delivered through Coinbase x402 payment rails on Base.
            Your routine proof lives on Solana.
          </Text>
        </View>

        {/* Privacy Card */}
        <Card accentColor={colors.primary}>
          <View style={styles.privacyRow}>
            <View style={styles.privacyIcon}>
              <MaterialIcons name="shield" size={20} color={colors.primary} />
            </View>
            <View style={styles.privacyText}>
              <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                Your Privacy is Protected
              </Text>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 8 }]}>
                We only share anonymized verification results, never your private
                capture sessions. Sponsors see aggregate data on routine
                completion rates, ensuring your personal moments remain entirely
                yours.
              </Text>
            </View>
          </View>
        </Card>

        {/* Featured Sponsor */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>FEATURED SPONSOR</Text>
          <Card style={styles.sponsorCard}>
            <View style={styles.sponsorHeader}>
              <View style={styles.sponsorLogo}>
                <Image source={{ uri: LOGO_URI }} style={styles.logoImage} />
              </View>
              <View>
                <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                  EcoLife Naturals
                </Text>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Supporting Morning Wellness Routines
                </Text>
              </View>
            </View>

            <View style={styles.quoteBox}>
              <MaterialIcons
                name="format-quote"
                size={32}
                color="rgba(196,200,192,0.4)"
                style={styles.quoteIcon}
              />
              <Text style={[typography.bodyMd, styles.quoteText]}>
                "We believe that small, consistent steps lead to profound
                changes. We're proud to support Rhythm users in taking those
                moments for themselves every day."
              </Text>
            </View>

            <View style={styles.sponsorFooter}>
              <Button
                label="Visit Sponsor"
                variant="secondary"
                onPress={() => openExternalUrl('https://example.com/ecolife-naturals')}
                icon={<MaterialIcons name="open-in-new" size={18} color={colors.primary} />}
                style={styles.visitBtn}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.marginPage,
    paddingBottom: 40,
    gap: spacing.stackLg,
  },
  hero: {
    height: 192,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    resizeMode: 'cover',
    opacity: 0.6,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainer,
    opacity: 0.4,
  },
  heroContent: { alignItems: 'center', gap: 16, zIndex: 1 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrative: { gap: spacing.stackSm },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(215,231,212,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: { flex: 1 },
  section: { gap: spacing.stackMd },
  sectionLabel: {
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  sponsorCard: { padding: 24 },
  sponsorHeader: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 24 },
  sponsorLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(196,200,192,0.3)',
  },
  logoImage: { width: 80, height: 80, resizeMode: 'cover' },
  quoteBox: {
    backgroundColor: 'rgba(240,238,232,0.5)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(229,226,220,0.5)',
  },
  quoteIcon: { position: 'absolute', top: 16, left: 16 },
  quoteText: {
    color: colors.onSurface,
    fontStyle: 'italic',
    paddingLeft: 32,
  },
  sponsorFooter: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    alignItems: 'flex-end',
  },
  visitBtn: { height: 48, paddingHorizontal: 24 },
});
