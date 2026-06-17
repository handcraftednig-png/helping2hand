import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { dark, gold } from '@/lib/theme';
import { PrayingHandsIcon } from '@/components/PrayingHandsIcon';

export function SplashFadeIn() {
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(10);

  useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    iconScale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.back(1.1)) });
    ringOpacity.value = withDelay(200, withTiming(0.6, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    textOpacity.value = withDelay(450, withTiming(1, { duration: 600 }));
    textY.value = withDelay(450, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <PrayingHandsIcon size={72} />
        </Animated.View>
        <Animated.Text style={[styles.title, textStyle]}>Helping Hand AI</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: gold[400],
    shadowColor: gold[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: dark.goldSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${gold[400]}50`,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: dark.text,
    marginTop: 24,
    letterSpacing: 0.3,
  },
});
