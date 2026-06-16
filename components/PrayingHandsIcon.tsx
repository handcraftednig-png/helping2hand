import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  size: number;
}

export function PrayingHandsIcon({ size }: Props) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <Text style={{ fontSize: size * 0.66, lineHeight: size * 0.88, textAlign: 'center' }}>
        🙏
      </Text>
      {/* Bottom fade — dissolves the icon into the dark background */}
      <LinearGradient
        colors={['transparent', 'rgba(13,13,13,0.55)', '#0D0D0D']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: size * 0.44 }}
        pointerEvents="none"
      />
    </View>
  );
}
