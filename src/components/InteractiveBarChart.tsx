import React, { useRef, useState, useEffect } from 'react';
import { View, Text, LayoutChangeEvent, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';

type BarData = {
  label: string;
  value: number;
  date: string;
};

type Props = {
  data: BarData[];
  barColor: string;
  activeBarColor: string;
  formatDetail?: (item: BarData) => string;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

// Each bar is rendered full-height; we mask it to the target fraction using
// a parent with overflow: hidden and animate translateY to "drop" the bar
// into place. scaleY alone is ambiguous without a reliable transformOrigin
// across RN versions, so this translateY approach is more portable.
function AnimatedBar({
  targetFraction,
  color,
  delay,
  faded,
}: {
  targetFraction: number;
  color: string;
  delay: number;
  faded: boolean;
}) {
  // 0 = fully hidden (translateY = 100%), 1 = fully visible (translateY = 0)
  const fraction = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(fraction, {
      toValue: targetFraction,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height is not native-driven; scale+height have caveats
    });
    anim.start();
    return () => anim.stop();
  }, [targetFraction, delay, fraction]);

  const height = fraction.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        barStyles.bar,
        {
          backgroundColor: color,
          opacity: faded ? 0.15 : 1,
          height,
        },
      ]}
    />
  );
}

export function InteractiveBarChart({
  data,
  barColor,
  activeBarColor,
  formatDetail,
  onScrubStart,
  onScrubEnd,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const chartWidthRef = useRef(0);
  const lastIndexRef = useRef<number | null>(null);
  const isScrubbingRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const beginScrub = () => {
    if (isScrubbingRef.current) return;
    isScrubbingRef.current = true;
    onScrubStart?.();
  };

  const endScrub = () => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    onScrubEnd?.();
  };

  const handleTouch = (x: number) => {
    const w = chartWidthRef.current;
    const len = dataRef.current.length;
    if (w === 0 || len === 0) return;

    const idx = Math.max(0, Math.min(len - 1, Math.floor((x / w) * len)));

    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setSelectedIndex(idx);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    chartWidthRef.current = e.nativeEvent.layout.width;
  };

  const selected = selectedIndex !== null ? data[selectedIndex] : null;
  const accessibilityLabel = `Chart with ${data.length} bars. ` +
    (selected
      ? `Selected: ${selected.date}, ${formatDetail ? formatDetail(selected) : selected.value}.`
      : 'No bar selected.');

  return (
    <View accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel}>
      <View
        style={styles.chart}
        onLayout={onLayout}
        onTouchStart={beginScrub}
        onTouchEnd={endScrub}
        onTouchCancel={endScrub}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          lastIndexRef.current = null;
          handleTouch(e.nativeEvent.locationX);
        }}
        onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderRelease={endScrub}
        onResponderTerminate={endScrub}
      >
        {data.map((item, i) => {
          const pct = item.value / maxValue;
          const isSelected = selectedIndex === i;
          const isLast = i === data.length - 1;
          const fraction = Math.max(pct, 0.06); // min 6% so 0 still shows a nub
          const color = isSelected || isLast ? activeBarColor : barColor;
          return (
            <View key={i} style={styles.barCol} pointerEvents="none">
              <View style={styles.barWrap}>
                <AnimatedBar
                  targetFraction={fraction}
                  color={color}
                  delay={i * 20}
                  faded={item.value === 0}
                />
              </View>
              <Text
                style={[
                  typography.labelSm,
                  {
                    color: isSelected || isLast ? colors.onSurface : colors.outlineVariant,
                    fontSize: 10,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
      {selected && (
        <View style={styles.detail}>
          <Text style={[typography.labelLg, { color: colors.onSurface }]}>
            {selected.date}
          </Text>
          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
            {formatDetail
              ? formatDetail(selected)
              : `${selected.value} ${selected.value === 1 ? 'item' : 'items'}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    gap: 2,
    height: 110,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barWrap: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  detail: {
    marginTop: spacing.stackSm,
    paddingTop: spacing.stackSm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    alignItems: 'center',
    gap: 2,
  },
});

const barStyles = StyleSheet.create({
  bar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 3,
  },
});
