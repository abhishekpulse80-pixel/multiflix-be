import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

const LINK = '#246BFD';

type Props = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  fontFamily: string;
};

export function InterestChip({ label, selected, onToggle, fontFamily }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}>
      <Text
        style={[
          styles.label,
          { fontFamily },
          selected ? styles.labelOn : styles.labelOff,
        ]}
        numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipOff: {
    backgroundColor: '#FFFFFF',
    borderColor: LINK,
  },
  chipOn: {
    backgroundColor: LINK,
    borderColor: LINK,
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
  },
  labelOff: {
    color: LINK,
  },
  labelOn: {
    color: '#FFFFFF',
  },
});
