import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  HomeTabBloggingIcon,
  HomeTabHouseIcon,
  HomeTabMusicIcon,
  HomeTabProfileIcon,
  HomeTabTrendingIcon,
} from '../icons/HomeTabIcons';

const LINK = '#246BFD';
const BAR_LIGHT = {
  bar: '#FFFFFF',
  inactive: '#6B6B6B',
  border: '#E8E8E8',
  indicator: '#D8D8D8',
} as const;
const BAR_DARK = {
  bar: '#000000',
  inactive: '#9A9A9A',
  border: '#1F1F1F',
  indicator: '#3A3A3A',
} as const;

export type HomeTabId = 'home' | 'trending' | 'blogging' | 'music' | 'profile';

type Props = {
  activeTab: HomeTabId;
  onTabChange: (tab: HomeTabId) => void;
  /** Use the dark palette (the focused screen is black-themed). */
  dark?: boolean;
};

export function HomeBottomBar({ activeTab, onTabChange, dark = false }: Props) {
  const c = dark ? BAR_DARK : BAR_LIGHT;

  const color = (tab: HomeTabId) => (activeTab === tab ? LINK : c.inactive);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: 12,
          backgroundColor: c.bar,
          borderTopColor: c.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          style={styles.tab}
          onPress={() => onTabChange('home')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'home' }}
        >
          <HomeTabHouseIcon
            size={24}
            color={color('home')}
            active={activeTab === 'home'}
          />
          {/* <Text
            style={[
              styles.label,
              { fontFamily: t.fontFamily.medium, color: color('home') },
            ]}
          >
            Home
          </Text> */}
        </Pressable>

        <Pressable
          style={styles.tab}
          onPress={() => onTabChange('trending')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'trending' }}
        >
          <HomeTabTrendingIcon size={24} color={color('trending')} />
          {/* <Text
            style={[
              styles.label,
              { fontFamily: t.fontFamily.medium, color: color('trending') },
            ]}
          >
            Trending
          </Text> */}
        </Pressable>

        <Pressable
          style={styles.tab}
          onPress={() => onTabChange('blogging')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'blogging' }}
        >
          <HomeTabBloggingIcon size={24} color={color('blogging')} />
          {/* <Text
            style={[
              styles.label,
              { fontFamily: t.fontFamily.medium, color: color('blogging') },
            ]}
          >
            Blogging
          </Text> */}
        </Pressable>

        <Pressable
          style={styles.tab}
          onPress={() => onTabChange('music')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'music' }}
        >
          <HomeTabMusicIcon size={24} color={color('music')} />
          {/* <Text
            style={[
              styles.label,
              { fontFamily: t.fontFamily.medium, color: color('music') },
            ]}
          >
            Music
          </Text> */}
        </Pressable>

        <Pressable
          style={styles.tab}
          onPress={() => onTabChange('profile')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <HomeTabProfileIcon size={24} color={color('profile')} />
          {/* <Text
            style={[
              styles.label,
              { fontFamily: t.fontFamily.medium, color: color('profile') },
            ]}
          >
            Profile
          </Text> */}
        </Pressable>
      </View>

      {Platform.OS === 'android' && (
        <View
          style={[styles.homeIndicator, { backgroundColor: c.indicator }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 128,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
});
