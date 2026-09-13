import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { hideMessage } from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const SURFACE = '#FFFFFF';
const TEXT = '#0D0D0D';
const DESC = '#4A4A4A';

type MessageShape = {
  message: string;
  description?: string;
  type?: string;
};

type Props = {
  message: MessageShape;
};

function CheckCircleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={TEXT}
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.4l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"
      />
    </Svg>
  );
}

function AlertCircleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={TEXT}
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"
      />
    </Svg>
  );
}

function InfoCircleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={TEXT}
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm-1-8.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"
      />
    </Svg>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={TEXT}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function iconFor(type?: string) {
  switch (type) {
    case 'success':
      return <CheckCircleIcon />;
    case 'danger':
    case 'warning':
      return <AlertCircleIcon />;
    default:
      return <InfoCircleIcon />;
  }
}

/** Global unified toast renderer wired via `<FlashMessage MessageComponent={...} />`. */
export function AppToastMessage({ message }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { message: title, description, type } = message ?? { message: '' };
  // Push the toast below the iOS notch / Dynamic Island and the Android
  // status bar. `insets.top` is 0 on devices without a top inset, so adding
  // 8px keeps the existing breathing room as a baseline.
  const topMargin = insets.top + 8;
  return (
    <View style={[styles.wrap, { marginTop: topMargin }]}>
      <View style={styles.icon}>{iconFor(type)}</View>
      <View style={styles.textWrap}>
        {title ? (
          <Text
            style={[styles.title, { fontFamily: t.fontFamily.semibold }]}
            numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text
            style={[styles.description, { fontFamily: t.fontFamily.regular }]}
            numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </View>
      <Pressable
        hitSlop={10}
        onPress={() => hideMessage()}
        style={styles.close}
        accessibilityLabel="Dismiss"
        accessibilityRole="button">
        <CloseIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: TEXT,
  },
  description: {
    fontSize: 13,
    color: DESC,
    marginTop: 2,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
