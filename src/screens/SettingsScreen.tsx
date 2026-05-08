import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackHeader, Card } from '../components';
import { useAppState } from '../state/AppState';
import { colors, typography, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { loadSettings, saveSettings } from '../state/Settings';

type SettingRowProps = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
};

function SettingRow({ icon, label, subtitle, onPress, trailing }: SettingRowProps) {
  const content = (
    <>
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{label}</Text>
        {subtitle && (
          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
        )}
      </View>
      {trailing}
      {onPress && !trailing && (
        <MaterialIcons name="chevron-right" size={24} color={colors.outlineVariant} />
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={label}>
      {content}
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showVideoThumbnails, setShowVideoThumbnails, dailyGoal, setDailyGoal, clearAllData } = useAppState();
  const [notifications, setNotifications] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    loadSettings().then((settings) => {
      setDemoMode(settings.demoMode);
    });
  }, []);

  const handleDemoModeChange = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDemoMode(value);
    saveSettings({ demoMode: value }).catch(() => {
      // Revert local state on persist failure so UI stays in sync.
      setDemoMode(!value);
      Alert.alert('Could not save settings', 'Please try again.');
    });
  };

  const handleVideoThumbnailsChange = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowVideoThumbnails(value);
  };

  const handleToggle = (setter: (v: boolean) => void) => (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setter(value);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Settings" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Card style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="person" size={32} color={colors.primaryContainer} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>Your Profile</Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                Manage your account and preferences
              </Text>
            </View>
          </View>
        </Card>

        {/* Daily Goal */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>DAILY GOAL</Text>
          <Card style={styles.groupCard}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <MaterialIcons name="flag" size={22} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[typography.bodyMd, { color: colors.onSurface }]}>Routines per day</Text>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                  How many routines you aim to complete each day
                </Text>
              </View>
              <View style={styles.goalStepper}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setDailyGoal(dailyGoal - 1);
                  }}
                  style={[styles.stepperBtn, dailyGoal <= 1 && styles.stepperBtnDisabled]}
                  disabled={dailyGoal <= 1}
                  accessibilityLabel="Decrease daily goal"
                  accessibilityHint={`Current goal: ${dailyGoal} per day. Minimum 1.`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="remove" size={18} color={dailyGoal <= 1 ? colors.outlineVariant : colors.primary} />
                </Pressable>
                <Text
                  style={[typography.headlineMd, { color: colors.primary, minWidth: 28, textAlign: 'center' }]}
                  accessibilityLiveRegion="polite"
                  accessibilityLabel={`Daily goal: ${dailyGoal} routines`}
                >
                  {dailyGoal}
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setDailyGoal(dailyGoal + 1);
                  }}
                  style={[styles.stepperBtn, dailyGoal >= 14 && styles.stepperBtnDisabled]}
                  disabled={dailyGoal >= 14}
                  accessibilityLabel="Increase daily goal"
                  accessibilityHint={`Current goal: ${dailyGoal} per day. Maximum 14.`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="add" size={18} color={dailyGoal >= 14 ? colors.outlineVariant : colors.primary} />
                </Pressable>
              </View>
            </View>
          </Card>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>NOTIFICATIONS</Text>
          <Card style={styles.groupCard}>
            <SettingRow
              icon="notifications"
              label="Routine Reminders"
              subtitle="Gentle nudges for your daily rhythms"
              trailing={
                <Switch
                  value={notifications}
                  onValueChange={handleToggle(setNotifications)}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={notifications ? colors.primary : colors.outline}
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow
              icon="do-not-disturb-on"
              label="Quiet Mode"
              subtitle="Pause all notifications"
              trailing={
                <Switch
                  value={quietMode}
                  onValueChange={handleToggle(setQuietMode)}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={quietMode ? colors.primary : colors.outline}
                />
              }
            />
          </Card>
        </View>

        {/* Accessibility */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>ACCESSIBILITY</Text>
          <Card style={styles.groupCard}>
            <SettingRow
              icon="animation"
              label="Reduced Motion"
              subtitle="Minimize animations throughout the app"
              trailing={
                <Switch
                  value={reducedMotion}
                  onValueChange={handleToggle(setReducedMotion)}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={reducedMotion ? colors.primary : colors.outline}
                />
              }
            />
          </Card>
        </View>

        {/* Privacy & Trust */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>PRIVACY & TRUST</Text>
          <Card style={styles.groupCard}>
            <SettingRow
              icon="handshake"
              label="About Sponsors"
              subtitle="How sponsors support your routines"
              onPress={() => navigation.navigate('Sponsors')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="movie"
              label="History Video Thumbnails"
              subtitle="Show small video previews in your activity timeline"
              trailing={
                <Switch
                  value={showVideoThumbnails}
                  onValueChange={handleVideoThumbnailsChange}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={showVideoThumbnails ? colors.primary : colors.outline}
                />
              }
            />
          </Card>
        </View>

        {/* Development */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>DEVELOPMENT</Text>
          <Card style={styles.groupCard}>
            <SettingRow
              icon="science"
              label="Demo Mode"
              subtitle="Skip video verification for testing"
              trailing={
                <Switch
                  value={demoMode}
                  onValueChange={handleDemoModeChange}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryFixed }}
                  thumbColor={demoMode ? colors.primary : colors.outline}
                />
              }
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>DATA</Text>
          <Card style={styles.groupCard}>
            <SettingRow
              icon="delete-outline"
              label="Clear All Data"
              subtitle="Remove all completions, favorites, and settings"
              onPress={() => {
                Alert.alert(
                  'Clear All Data',
                  'This will permanently delete all your completions, favorites, and settings. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear Everything',
                      style: 'destructive',
                      onPress: () => {
                        try {
                          clearAllData();
                          navigation.dispatch(
                            CommonActions.reset({
                              index: 0,
                              routes: [{ name: 'Welcome' }],
                            })
                          );
                        } catch (e) {
                          Alert.alert(
                            'Could not clear data',
                            'Something went wrong. Please try again.',
                          );
                        }
                      },
                    },
                  ]
                );
              }}
            />
          </Card>
        </View>

        {/* Version */}
        <Text style={[typography.labelSm, styles.version]}>
          Rhythm v1.0.0 · Idea Stage
        </Text>
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
  profileCard: { padding: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: 4 },
  section: { gap: spacing.stackSm },
  sectionLabel: {
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: 4,
  },
  groupCard: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    minHeight: spacing.touchTarget,
  },
  rowPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
  version: {
    color: colors.outlineVariant,
    textAlign: 'center',
    marginTop: spacing.stackSm,
  },
  goalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
  },
});
