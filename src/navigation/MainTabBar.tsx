import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { HomeBottomBar, type HomeTabId } from '../components/home/HomeBottomBar';
import type { MainTabParamList } from './types';

/** Treat tabBarStyle.display === 'none' as a hide signal, even when the
 * style is supplied as an array (RN flattens those). Screens use this via
 * navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } })
 * to hide the bar in immersive flows like fullscreen video. */
function isHidden(style: ViewStyle | ViewStyle[] | undefined): boolean {
  if (!style) return false;
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  return flat?.display === 'none';
}

/** Leaf route names whose screens are black-themed → dark tab bar. Keyed on
 * the deepest active route so e.g. Music "Now Playing" is dark but the Music
 * list stays light, and Blogging main is dark but BloggingWatch stays light. */
const DARK_BAR_ROUTES = new Set([
  'home',
  'HomeFeed',
  'blogging',
  'BloggingMain',
  'BloggingWatch',
  'MusicNowPlaying',
]);

/** Walk a tab route to its deepest active (leaf) route name. */
function activeLeafName(route: { name: string; state?: unknown }): string {
  let r: { name: string; state?: unknown } = route;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any = r.state;
  while (s?.routes && typeof s.index === 'number') {
    r = s.routes[s.index];
    s = r.state;
  }
  return r.name;
}

export function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;
  if (isHidden(focusedOptions?.tabBarStyle as ViewStyle | ViewStyle[] | undefined)) {
    return null;
  }

  const activeTab = focusedRoute.name as HomeTabId;
  const dark = DARK_BAR_ROUTES.has(activeLeafName(focusedRoute));

  return (
    <HomeBottomBar
      activeTab={activeTab}
      dark={dark}
      onTabChange={tab => {
        const route = state.routes.find(r => r.name === tab);
        const isActive = activeTab === tab;
        // Emit tabPress (same contract as the default tab bar) so the focused
        // screen can react to a re-press — e.g. scroll-to-top + refresh.
        if (route) {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          // Re-pressing the active tab: let the screen handle it, don't re-navigate.
          if (isActive || event.defaultPrevented) {
            return;
          }
        }
        navigation.navigate(tab as keyof MainTabParamList);
      }}
    />
  );
}
