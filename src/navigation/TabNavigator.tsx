import React from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
  HomeScreen,
  RoutinesScreen,
  RewardsScreen,
  HistoryScreen,
} from '../screens';
import { colors } from '../theme';
import type { TabParamList, RootStackParamList } from './types';

const TAB_ORDER: (keyof TabParamList)[] = ['Home', 'Routines', 'Rewards', 'History'];
const SWIPE_DISTANCE = 55;
const SWIPE_VELOCITY = 0.35;
const HORIZONTAL_SLOPE = 1.25;
const EDGE_RESISTANCE = 0.25;

const TAB_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  Home: 'home',
  Routines: 'event-repeat',
  Rewards: 'payments',
  History: 'history',
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Routines: 'Routines',
  Rewards: 'Rewards',
  History: 'History',
};

export function TabNavigator() {
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  const initialTab = route.params?.screen ?? 'Home';
  const initialIndex = Math.max(0, TAB_ORDER.indexOf(initialTab));
  const { width } = useWindowDimensions();
  const translateX = React.useRef(new Animated.Value(-initialIndex * width)).current;
  const activeIndexRef = React.useRef(initialIndex);
  const gestureStartXRef = React.useRef(-initialIndex * width);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  const commitIndex = React.useCallback(
    (index: number, animated: boolean) => {
      const nextIndex = clampIndex(index);
      const targetX = -nextIndex * width;

      if (nextIndex === activeIndexRef.current) return;

      if (animated) {
        Animated.timing(translateX, {
          toValue: targetX,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          activeIndexRef.current = nextIndex;
          gestureStartXRef.current = targetX;
          setActiveIndex(nextIndex);
          Haptics.selectionAsync().catch(() => {});
        });
      } else {
        activeIndexRef.current = nextIndex;
        gestureStartXRef.current = targetX;
        setActiveIndex(nextIndex);
        translateX.setValue(targetX);
        Haptics.selectionAsync().catch(() => {});
      }
    },
    [translateX, width]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => isHorizontalSwipe(gesture.dx, gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation((value) => {
            const settledIndex = clampIndex(Math.round(-value / width));
            const settledX = -settledIndex * width;

            activeIndexRef.current = settledIndex;
            gestureStartXRef.current = settledX;
            setActiveIndex(settledIndex);
            translateX.setValue(settledX);
          });
        },
        onPanResponderMove: (_, gesture) => {
          const currentIndex = activeIndexRef.current;
          const nextIndex = gesture.dx < 0 ? currentIndex + 1 : currentIndex - 1;
          const hasNextPage = nextIndex >= 0 && nextIndex < TAB_ORDER.length;
          translateX.setValue(
            gestureStartXRef.current + (hasNextPage ? gesture.dx : gesture.dx * EDGE_RESISTANCE)
          );
        },
        onPanResponderRelease: (_, gesture) => {
          const currentIndex = activeIndexRef.current;
          const nextIndex = gesture.dx < 0 ? currentIndex + 1 : currentIndex - 1;
          const targetIndex = clampIndex(nextIndex);
          const shouldMove =
            Math.abs(gesture.dx) > SWIPE_DISTANCE || Math.abs(gesture.vx) > SWIPE_VELOCITY;

          if (
            shouldMove &&
            nextIndex >= 0 &&
            nextIndex < TAB_ORDER.length &&
            isHorizontalSwipe(gesture.dx, gesture.dy)
          ) {
            Animated.timing(translateX, {
              toValue: -targetIndex * width,
              duration: 160,
              useNativeDriver: true,
            }).start(() => {
              activeIndexRef.current = targetIndex;
              gestureStartXRef.current = -targetIndex * width;
              setActiveIndex(targetIndex);
              Haptics.selectionAsync().catch(() => {});
            });
          } else {
            resetDrag(translateX, -currentIndex * width);
            gestureStartXRef.current = -currentIndex * width;
          }
        },
        onPanResponderTerminate: () => {
          const targetX = -activeIndexRef.current * width;
          gestureStartXRef.current = targetX;
          resetDrag(translateX, targetX);
        },
      }),
    [translateX, width]
  );

  React.useEffect(() => {
    const targetX = -activeIndexRef.current * width;
    gestureStartXRef.current = targetX;
    translateX.setValue(targetX);
  }, [translateX, width]);

  return (
    <View style={styles.container}>
      <View style={styles.viewport} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.pageRow,
            {
              width: width * TAB_ORDER.length,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={[styles.page, { width }]}>
            <HomeScreen />
          </View>
          <View style={[styles.page, { width }]}>
            <RoutinesScreen />
          </View>
          <View style={[styles.page, { width }]}>
            <RewardsScreen />
          </View>
          <View style={[styles.page, { width }]}>
            <HistoryScreen />
          </View>
        </Animated.View>
      </View>
      <View style={[styles.tabBar, styles.tabShadow]}>
        {TAB_ORDER.map((tabName, index) => {
          const isActive = activeIndex === index;
          const color = isActive ? colors.primaryContainer : '#a8a8a8';

          return (
            <Pressable
              key={tabName}
              style={styles.tabItem}
              onPress={() => commitIndex(index, true)}
            >
              <MaterialIcons name={TAB_ICONS[tabName]} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{TAB_LABELS[tabName]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function isHorizontalSwipe(dx: number, dy: number) {
  return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_SLOPE;
}

function resetDrag(translateX: Animated.Value, targetX: number) {
  Animated.spring(translateX, {
    toValue: targetX,
    useNativeDriver: true,
    tension: 120,
    friction: 16,
  }).start();
}

function clampIndex(index: number) {
  return Math.max(0, Math.min(TAB_ORDER.length - 1, index));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  viewport: { flex: 1, overflow: 'hidden' },
  pageRow: { flex: 1, flexDirection: 'row' },
  page: { flex: 1 },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    fontWeight: '500',
  },
  tabShadow: {
    shadowColor: 'rgba(94,109,94,0.08)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
});
