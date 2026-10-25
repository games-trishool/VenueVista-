import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';
export function VenueSkeleton() {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 1000 }), -1, true);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityLabel="Loading venues"
      style={[
        { backgroundColor: colors.surface, borderRadius: 22, padding: 16, marginBottom: 20 },
        animatedStyle,
      ]}
    >
      <View style={{ height: 175, backgroundColor: colors.border, borderRadius: 14 }} />
      <View
        style={{
          height: 20,
          width: '65%',
          backgroundColor: colors.border,
          borderRadius: 4,
          marginTop: 18,
        }}
      />
      <View
        style={{
          height: 12,
          width: '45%',
          backgroundColor: colors.border,
          borderRadius: 4,
          marginTop: 10,
          marginBottom: 10,
        }}
      />
    </Animated.View>
  );
}
