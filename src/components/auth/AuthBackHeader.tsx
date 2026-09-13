import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
type Props = {
  onBack?: () => void;
  visible?: boolean;
  /** Hide just the back arrow while keeping the title (e.g. onboarding roots). */
  showBack?: boolean;
  /** Inline title to the right of the back control (e.g. interests picker). */
  title?: string;
  titleStyle?: StyleProp<TextStyle>;
};

export function AuthBackHeader({
  onBack,
  visible = true,
  showBack = true,
  title,
  titleStyle,
}: Props) {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={onBack}
            style={styles.btn}>
            <Text style={styles.arrow}>←</Text>
          </Pressable>
        ) : null}
        {title ? (
          <Text style={[styles.title, titleStyle]} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  title: {
    flex: 1,
    marginLeft: 4,
    fontSize: 22,
    fontWeight: '700',
    color: '#0A0A0A',
    paddingRight: 8,
  },
  btn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 26,
    color: '#0A0A0A',
    marginTop: -2,
  },
});
