import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

const BG_COLOR = '#0f172a';
const GRADIENT_START = '#4CFCAD';
const GRADIENT_END = '#4CD0FC';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Step 1: Logo fades in + scales up (600ms spring)
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 120 });

    // Step 2: Tagline fades in after 400ms delay
    taglineOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );

    // Step 3: Hold 500ms after tagline finishes, then fade out (400ms)
    // Tagline finishes at ~800ms, hold until 1300ms, fade-out completes at 1700ms
    containerOpacity.value = withDelay(
      1300,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
    );

    // Notify parent after full animation completes
    const timeout = setTimeout(() => {
      handleFinish();
    }, 1750);

    return () => clearTimeout(timeout);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* FORGE logo with gradient text */}
      <Animated.View style={logoAnimatedStyle}>
        <Svg width={300} height={70} viewBox="0 0 300 70">
          <Defs>
            <LinearGradient id="forgeGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={GRADIENT_START} />
              <Stop offset="1" stopColor={GRADIENT_END} />
            </LinearGradient>
          </Defs>
          <SvgText
            x="150"
            y="50"
            textAnchor="middle"
            fontWeight="900"
            fontSize="56"
            letterSpacing={6}
            fill="url(#forgeGrad)"
          >
            FORGE
          </SvgText>
        </Svg>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={taglineAnimatedStyle}>
        <Svg width={300} height={30} viewBox="0 0 300 30">
          <Defs>
            <LinearGradient id="tagGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={GRADIENT_START} />
              <Stop offset="1" stopColor={GRADIENT_END} />
            </LinearGradient>
          </Defs>
          <SvgText
            x="150"
            y="20"
            textAnchor="middle"
            fontWeight="500"
            fontSize="14"
            letterSpacing={1}
            fill="url(#tagGrad)"
          >
            Build Strength. Track Progress.
          </SvgText>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
