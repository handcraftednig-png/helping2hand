import React from 'react';
import { View } from 'react-native';
import { Hand } from 'lucide-react-native';
import { gold } from '@/lib/theme';

interface Props {
  size: number;
}

export function PrayingHandsIcon({ size }: Props) {
  const handSize = size * 0.58;
  const shadowColor = gold[800];

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ transform: [{ rotate: '-16deg' }, { translateX: handSize * 0.16 }] }}>
          <Hand size={handSize} color={shadowColor} strokeWidth={1.4} />
        </View>
        <View style={{ transform: [{ scaleX: -1 }, { rotate: '-16deg' }, { translateX: handSize * 0.16 }] }}>
          <Hand size={handSize} color={shadowColor} strokeWidth={1.4} />
        </View>
      </View>
    </View>
  );
}
