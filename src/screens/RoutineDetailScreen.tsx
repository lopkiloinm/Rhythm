import React from 'react';
import { Animated, View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHeader, Card, Button } from '../components';
import { useAppState } from '../state/AppState';
import { colors, typography, spacing, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const DEFAULT_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD9rixeDlYqwRkxv54lasH2MXjNfCbaSszGOwrYMx1HVS5ficSt8VrekVKFdgoAMl3Mn1_mXYOBx0HM1WZU-OC8nfFKyRPFcP9e6BuKjmln7QSt6G7Xkk7Ayw6AYOoEuz1siyp4Y2kgL57DeEkwualcDT-oKHkPek8xr715bwlac-tCRgxBgNmOGWW_suAv46MkiDqcirnztZPPFpevepVG1cq0BI5gzYBD9CnvbnaTcBqhDrVuX7KzH9gXlTvr1cRsWCRkiCj9Dw2M';

export function RoutineDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RoutineDetail'>>();
  const { routine } = route.params;
  const { favoriteRoutineIds, toggleFavoriteRoutine, isRoutineCompletedToday } = useAppState();
  const isFavorite = favoriteRoutineIds.includes(routine.id);
  const completedToday = isRoutineCompletedToday(routine.id);
  const starScale = React.useRef(new Animated.Value(1)).current;
  const navigatedRef = React.useRef(false);

  const goToCapture = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigation.navigate('Capture', { routine });
    // Reset the latch after the nav animation so returning to this screen
    // still allows re-entering Capture on a subsequent tap.
    setTimeout(() => { navigatedRef.current = false; }, 600);
  };

  const handleToggleFavorite = () => {
    Haptics.selectionAsync().catch(() => {});
    Animated.sequence([
      Animated.timing(starScale, {
        toValue: 1.25,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(starScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
    toggleFavoriteRoutine(routine.id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title={routine.title} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={[styles.hero, shadows.diffuse]}>
          <Image source={{ uri: routine.imageUri ?? DEFAULT_IMAGE }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
        </View>

        {/* Reward Banner */}
        <View style={styles.actionRow}>
          <View style={styles.rewardBanner}>
            <MaterialIcons name="stars" size={20} color={colors.onTertiaryFixed} />
            <Text style={[typography.labelLg, { color: colors.onTertiaryFixed }]}>
              {routine.credits} Credits available
            </Text>
          </View>
          <Pressable
            onPress={handleToggleFavorite}
            style={({ pressed }) => [styles.favoriteButton, pressed && styles.favoriteButtonPressed]}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Animated.View style={{ transform: [{ scale: starScale }] }}>
              <MaterialIcons
                name={isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={isFavorite ? colors.tertiary : colors.onSurfaceVariant}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* Sponsor Badge */}
        {routine.sponsored && routine.sponsorName && (
          <View style={styles.sponsorBadge}>
            <MaterialIcons name="verified" size={16} color={colors.primary} />
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
              Sponsored by {routine.sponsorName}
            </Text>
          </View>
        )}

        {/* Steps Card */}
        <Card style={styles.stepsCard}>
          <Text style={[typography.headlineMd, { color: colors.primary, marginBottom: 24 }]}>
            Routine Steps
          </Text>
          {routine.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={[typography.labelLg, { color: colors.onPrimaryFixed }]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[typography.bodyMd, { color: colors.onSurface, flex: 1, paddingTop: 4 }]}>
                {step}
              </Text>
            </View>
          ))}
        </Card>

        {/* Verification Info */}
        <View style={styles.verifyInfo}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
            {routine.verifyHint}
          </Text>
        </View>

        {/* Time Limit Info */}
        <View style={styles.timeLimitInfo}>
          <MaterialIcons name="timer" size={16} color={colors.outline} />
          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, flex: 1 }]}>
            Clips are up to 30 seconds. You can stop anytime before that.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <LinearGradient
        colors={['transparent', colors.surface, colors.surface]}
        locations={[0, 0.35, 1]}
        style={styles.bottomCta}
      >
        {completedToday ? (
          <View style={styles.completedBanner}>
            <MaterialIcons name="check-circle" size={20} color={colors.primary} />
            <Text style={[typography.labelLg, { color: colors.primary }]}>
              Completed today
            </Text>
          </View>
        ) : (
          <Button
            label="Start Recording"
            onPress={goToCapture}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: spacing.marginPage,
    paddingBottom: 120,
    gap: spacing.stackLg,
  },
  hero: {
    height: 256,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.tertiaryFixed,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...shadows.soft,
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.soft,
  },
  favoriteButtonPressed: { backgroundColor: colors.surfaceContainerLow },
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  stepsCard: { padding: 24 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,200,192,0.3)',
  },
  timeLimitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.marginPage,
    paddingBottom: 32,
    paddingTop: 24,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryFixed,
    borderRadius: 12,
    height: 56,
  },
});
