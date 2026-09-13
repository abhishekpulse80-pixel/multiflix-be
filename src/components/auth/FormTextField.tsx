import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

/** Focus ring + icons (matches login mock) */
const FOCUS_BORDER = '#246BFD';
const FIELD_BG = '#FAFAFA';
const FOCUS_TINT_BG = '#FFF6F6';

type Props = {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  focused: boolean;
  /** Focused row — light pink tint (typing state) */
  accentSurface?: boolean;
  /** Merged onto the outer field container (e.g. border radius). */
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps;

export function FormTextField({
  leftIcon,
  rightIcon,
  onRightPress,
  focused,
  accentSurface,
  containerStyle,
  style,
  ...inputProps
}: Props) {
  return (
    <View
      style={[
        styles.field,
        focused && styles.fieldFocused,
        accentSurface && focused && styles.fieldAccentBg,
        containerStyle,
      ]}
    >
      {leftIcon != null ? <View style={styles.left}>{leftIcon}</View> : null}
      <TextInput
        placeholderTextColor="#8A8A8A"
        style={[styles.input, style]}
        {...inputProps}
      />
      {rightIcon ? (
        <Pressable
          accessibilityRole={onRightPress ? 'button' : undefined}
          onPress={onRightPress}
          hitSlop={8}
          style={styles.right}
          disabled={!onRightPress}
        >
          {rightIcon}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: FIELD_BG,
    paddingHorizontal: 18,
    minHeight: 56,
  },
  fieldFocused: {
    borderColor: FOCUS_BORDER,
  },
  fieldAccentBg: {
    backgroundColor: FOCUS_TINT_BG,
  },
  left: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0A0A0A',
    paddingVertical: 14,
  },
  right: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
