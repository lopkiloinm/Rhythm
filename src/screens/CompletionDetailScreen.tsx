import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BackHeader, Card } from '../components';
import { formatCompletionTime } from '../utils/time';
import { colors, typography, spacing, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { SOLANA_EXPLORER_CLUSTER_PARAM } from '../config/solana';
import { openExternalUrl } from '../utils/link';

export function CompletionDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CompletionDetail'>>();
  const { completion } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Completion" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Playback — isolated in a component so we obey Rules of Hooks */}
        {completion.videoUri ? (
          <VideoPlayback videoUri={completion.videoUri} />
        ) : (
          <View style={[styles.videoWrap, styles.noVideo]}>
            <MaterialIcons name="videocam-off" size={48} color={colors.outlineVariant} />
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 12 }]}>
              Video not available
            </Text>
          </View>
        )}

        {/* Task Info */}
        <View style={styles.taskHeader}>
          <View style={styles.taskIcon}>
            <MaterialIcons name={completion.icon as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.taskInfo}>
            <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
              {completion.task}
            </Text>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
              {formatCompletionTime(completion.timestamp)}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.detailList, shadows.diffuse]}>
          <DetailRow
            label="Status"
            value={completion.selfVerified ? 'Self-verified' : 'Verified'}
            icon={completion.selfVerified ? 'person' : 'check-circle'}
            iconColor={completion.selfVerified ? colors.outline : colors.primary}
          />
          <View style={styles.divider} />
          <DetailRow label="Sponsor" value={completion.sponsor} icon="verified" iconColor={colors.primary} />
          <View style={styles.divider} />
          <DetailRow
            label="Credits Earned"
            value={completion.selfVerified ? 'None' : completion.credits}
            icon="stars"
            iconColor={completion.selfVerified ? colors.outline : colors.tertiary}
          />
          <View style={styles.divider} />
          <DetailRow
            label="Verified By"
            value={completion.selfVerified ? 'You' : 'Amazon Nova 2 Lite'}
            icon="auto-awesome"
            iconColor={colors.primary}
          />
          {completion.location && (
            <>
              <View style={styles.divider} />
              <DetailRow
                label="Location"
                value={`${completion.location.latitude.toFixed(4)}, ${completion.location.longitude.toFixed(4)}`}
                icon="location-on"
                iconColor={colors.primary}
              />
            </>
          )}
          {completion.txSignature && (
            <>
              <View style={styles.divider} />
              <Pressable
                onPress={() =>
                  openExternalUrl(
                    `https://explorer.solana.com/tx/${completion.txSignature}?cluster=${SOLANA_EXPLORER_CLUSTER_PARAM}`,
                  )
                }
                style={styles.detailRow}
                accessibilityRole="link"
                accessibilityLabel={`Open transaction ${completion.txSignature} on Solana Explorer`}
              >
                <MaterialIcons name="link" size={20} color={colors.primary} />
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, flex: 1 }]}>
                  On-Chain
                </Text>
                <Text style={[typography.labelLg, { color: colors.primary }]}>
                  {`${completion.txSignature.slice(0, 8)}...`}
                </Text>
                <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
              </Pressable>
            </>
          )}
        </View>

        {/* Privacy Note */}
        <Card>
          <View style={styles.privacyRow}>
            <MaterialIcons name="shield" size={18} color={colors.outline} />
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, flex: 1 }]}>
              This video is stored on your device. Only anonymized verification
              results are shared with sponsors.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function VideoPlayback({ videoUri }: { videoUri: string }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
  });

  // expo-video fires statusChange when the player is ready to play.
  React.useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: any) => {
      if (status === 'readyToPlay' || status === 'loaded') setReady(true);
    });
    // Fallback — mark ready after a short delay in case the event never fires.
    const timeout = setTimeout(() => setReady(true), 1500);
    return () => {
      sub?.remove?.();
      clearTimeout(timeout);
    };
  }, [player]);

  return (
    <View style={styles.videoWrap}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls
        contentFit="cover"
      />
      {!ready && (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
}) {
  return (
    <View style={styles.detailRow} accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
      <MaterialIcons name={icon} size={20} color={iconColor} />
      <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, flex: 1 }]}>
        {label}
      </Text>
      <Text style={[typography.labelLg, { color: colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.marginPage, paddingBottom: 40, gap: spacing.stackLg },
  videoWrap: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  noVideo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: { flex: 1, gap: 4 },
  detailList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});
