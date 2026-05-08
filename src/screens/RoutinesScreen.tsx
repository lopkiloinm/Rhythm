import React, { useState, useMemo } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopBar, Chip } from '../components';
import { useAppState } from '../state/AppState';
import { colors, typography, spacing, shadows } from '../theme';
import { ROUTINES, CATEGORIES, getRoutinesByCategory } from '../data/routines';
import type { RootStackParamList, RoutineData } from '../navigation/types';

const FEATURED_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA75qHJG-guhVu7dFRp2KkfqSEDWZ7OJSitPLi1nR0Oj2i6dz9OSOQGnjLehyXaTWXRtZor-Rq-KbeuUdjqewZq5R2kta-r4JoIbbaiGhuwrxHCKg7CfGGYht_n3aJYuvDIBpBQyNpeJ1NzASKWMwUzk7uDVEEq2E9tq2o9gJNH9EmEf5IvC2DNakAmZ2tAUlWpLwmCMBm-R0AedYPWhn2j6PXwLOozjsB4ImqNxTGLk1i6SC0b3QSbNQJ-FE_cYV4mWQBaWjqNcqoW';
const FAVORITES_FILTER = 'Favorites';

type FilterValue = string | null;
type FilterOption = {
  key: string;
  label: string;
  value: FilterValue;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
};

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'All', value: null },
  { key: 'favorites', label: 'Favorites', value: FAVORITES_FILTER, icon: 'star' },
  ...CATEGORIES.map((cat) => ({
    key: cat.label,
    label: cat.label,
    value: cat.label,
    icon: cat.icon as React.ComponentProps<typeof MaterialIcons>['name'],
  })),
];

function RoutineRow({
  routine,
  onPress,
  isFavorite,
  onToggleFavorite,
  completedToday,
}: {
  routine: RoutineData;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  completedToday?: boolean;
}) {
  const starScale = React.useRef(new Animated.Value(1)).current;

  const handleFavoritePress = () => {
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
    onToggleFavorite();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.routineRow, pressed && styles.routineRowPressed]}
    >
      <View style={[styles.routineIcon, completedToday && styles.routineIconDone]}>
        <MaterialIcons
          name={completedToday ? 'check' : (routine.icon as any)}
          size={20}
          color={completedToday ? colors.onPrimary : colors.primary}
        />
      </View>
      <View style={styles.routineInfo}>
        <Text style={[typography.labelLg, { color: colors.onSurface }]}>{routine.title}</Text>
        <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
          {routine.description}
        </Text>
      </View>
      <View style={styles.routineTrailing}>
        <View style={styles.creditPill}>
          <MaterialIcons name="stars" size={12} color={colors.tertiary} />
          <Text style={[typography.labelSm, { color: colors.tertiary }]}>{routine.credits}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleFavoritePress();
          }}
          hitSlop={10}
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Animated.View style={{ transform: [{ scale: starScale }] }}>
            <MaterialIcons
              name={isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={isFavorite ? colors.tertiary : colors.outlineVariant}
            />
          </Animated.View>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function RoutinesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favoriteRoutineIds, toggleFavoriteRoutine, todayRoutineIds } = useAppState();
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedCategories = filter && filter !== FAVORITES_FILTER
    ? CATEGORIES.filter((c) => c.label === filter)
    : CATEGORIES;

  // Search filtering
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    return ROUTINES.filter(
      (r) =>
        r.title.toLowerCase().includes(normalizedQuery) ||
        r.description.toLowerCase().includes(normalizedQuery) ||
        r.category.toLowerCase().includes(normalizedQuery) ||
        (r.sponsorName?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  }, [normalizedQuery]);

  const navigatingRef = React.useRef(false);
  const goToRoutine = (routine: RoutineData) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    navigation.navigate('RoutineDetail', { routine });
    setTimeout(() => { navigatingRef.current = false; }, 600);
  };

  const handleToggleFavorite = (routineId: string) => {
    Haptics.selectionAsync().catch(() => {});
    toggleFavoriteRoutine(routineId);
  };

  const selectFilter = (nextFilter: FilterValue) => {
    if (filter === nextFilter) return;
    setFilter(nextFilter);
    Haptics.selectionAsync().catch(() => {});
  };

  const handleFilterPress = (option: FilterOption) => {
    selectFilter(filter === option.value && option.value !== null ? null : option.value);
  };

  const featured = ROUTINES[0]; // Hydrate — the most accessible starting routine
  const favoriteIdSet = new Set(favoriteRoutineIds);
  const favoriteRoutines = favoriteRoutineIds
    .map((id) => ROUTINES.find((routine) => routine.id === id))
    .filter((routine): routine is RoutineData => Boolean(routine));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Routines" onAvatarPress={() => navigation.navigate('Profile')} onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
            Browse and start your daily rhythms.
          </Text>
        </View>

        {/* Featured */}
        <Pressable
          onPress={() => goToRoutine(featured)}
          style={({ pressed }) => [styles.featured, shadows.diffuse, pressed && styles.featuredPressed]}
        >
          <Image source={{ uri: FEATURED_BG }} style={styles.featuredBg} />
          <View style={styles.featuredOverlay} />
          <View style={styles.featuredContent}>
            <View style={styles.featuredChip}>
              <MaterialIcons name="stars" size={14} color={colors.secondary} />
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                Recommended
              </Text>
            </View>
            <Text style={[typography.headlineLg, { color: colors.onSurface }]}>
              {featured.title}
            </Text>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
              {featured.description}
            </Text>
          </View>
        </Pressable>

        {/* Search */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.outline} />
          <TextInput
            style={[typography.bodyMd, styles.searchInput]}
            placeholder="Search routines..."
            placeholderTextColor={colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search routines"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <MaterialIcons name="close" size={18} color={colors.outline} />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              active={filter === option.value}
              onPress={() => handleFilterPress(option)}
              icon={
                option.icon ? (
                  <MaterialIcons
                    name={option.icon}
                    size={16}
                    color={filter === option.value ? colors.primary : colors.onSurfaceVariant}
                  />
                ) : undefined
              }
            />
          ))}
        </ScrollView>

        {/* Search Results */}
        {searchResults !== null ? (
          searchResults.length > 0 ? (
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                  Results
                </Text>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                  {searchResults.length}
                </Text>
              </View>
              <View style={[styles.categoryList, shadows.diffuse]}>
                {searchResults.map((routine, i) => (
                  <View key={routine.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <RoutineRow
                      routine={routine}
                      onPress={() => goToRoutine(routine)}
                      isFavorite={favoriteIdSet.has(routine.id)}
                      onToggleFavorite={() => handleToggleFavorite(routine.id)}
                      completedToday={todayRoutineIds.has(routine.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyFavorites}>
              <MaterialIcons name="search-off" size={20} color={colors.outlineVariant} />
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                No routines match "{searchQuery}"
              </Text>
            </View>
          )
        ) : filter === FAVORITES_FILTER ? (
          <View style={styles.favoritesSection}>
            <View style={styles.categoryHeader}>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                Favorites
              </Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                {favoriteRoutines.length}
              </Text>
            </View>
            {favoriteRoutines.length > 0 ? (
              <View style={[styles.categoryList, shadows.diffuse]}>
                {favoriteRoutines.map((routine, i) => (
                  <View key={routine.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <RoutineRow
                      routine={routine}
                      onPress={() => goToRoutine(routine)}
                      isFavorite
                      onToggleFavorite={() => handleToggleFavorite(routine.id)}
                      completedToday={todayRoutineIds.has(routine.id)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyFavorites}>
                <MaterialIcons name="star-outline" size={20} color={colors.outlineVariant} />
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                  Star routines to keep them close.
                </Text>
              </View>
            )}
          </View>
        ) : displayedCategories.map((cat) => {
          const routines = getRoutinesByCategory(cat.label);
          if (routines.length === 0) return null;
          return (
            <View key={cat.label} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                  {cat.label}
                </Text>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                  {routines.length}
                </Text>
              </View>
              <View style={[styles.categoryList, shadows.diffuse]}>
                {routines.map((routine, i) => (
                  <View key={routine.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <RoutineRow
                      routine={routine}
                      onPress={() => goToRoutine(routine)}
                      isFavorite={favoriteIdSet.has(routine.id)}
                      onToggleFavorite={() => handleToggleFavorite(routine.id)}
                      completedToday={todayRoutineIds.has(routine.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.marginPage, paddingBottom: 120, gap: spacing.stackLg },

  // Featured
  featured: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 150,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: colors.surfaceContainer,
  },
  featuredPressed: { opacity: 0.92 },
  featuredBg: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    resizeMode: 'cover',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(252,249,243,0.55)',
  },
  featuredContent: { zIndex: 1 },
  featuredChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(252,249,243,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 8,
  },

  // Filter
  filterScroll: {
    marginHorizontal: -spacing.marginPage,
  },
  filterRow: {
    gap: spacing.stackSm,
    paddingHorizontal: spacing.marginPage,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    padding: 0,
  },

  // Favorites
  favoritesSection: { gap: spacing.stackSm },
  emptyFavorites: {
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },

  // Category sections
  categorySection: { gap: spacing.stackSm },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },

  // Routine row
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  routineRowPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  routineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineIconDone: {
    backgroundColor: colors.primary,
  },
  routineInfo: { flex: 1, gap: 2 },
  routineTrailing: { alignItems: 'flex-end', gap: 4 },
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,222,169,0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
});
