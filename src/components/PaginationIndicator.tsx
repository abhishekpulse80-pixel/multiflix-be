import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  count: number;
  activeIndex: number;
};

export function PaginationIndicator({ count, activeIndex }: Props) {
  const t = useTheme();

  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <View
            key={i}
            style={[
              active ? styles.pill : styles.dot,
              {
                backgroundColor: active
                  ? t.colors.accent
                  : t.palette.gray300,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
