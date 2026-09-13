import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

const FOCUS_BORDER = '#246BFD';
const FIELD_BG = '#FAFAFA';
const FOCUS_TINT_BG = '#FFF6F6';

type Props = {
  focused: boolean;
  accentSurface?: boolean;
} & TextInputProps;

export function ProfilePhoneField({
  focused,
  accentSurface,
  style,
  ...inputProps
}: Props) {
  return (
    <View
      style={[
        styles.field,
        focused && styles.fieldFocused,
        accentSurface && focused && styles.fieldAccentBg,
      ]}
    >
      <Pressable
        style={styles.country}
        accessibilityRole="button"
        accessibilityLabel="Country code, United States"
        hitSlop={6}
      >
        <Text style={styles.flag}>🇮🇳</Text>
      </Pressable>
      <View style={styles.divider} />
      <TextInput
        placeholder="Phone Number"
        placeholderTextColor="#8A8A8A"
        keyboardType="phone-pad"
        style={[styles.input, style]}
        {...inputProps}
      />
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
    paddingLeft: 12,
    paddingRight: 16,
    minHeight: 56,
  },
  fieldFocused: {
    borderColor: FOCUS_BORDER,
  },
  fieldAccentBg: {
    backgroundColor: FOCUS_TINT_BG,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  flag: {
    fontSize: 22,
  },
  chevron: {
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: -4,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0A0A0A',
    paddingVertical: 14,
  },
});
