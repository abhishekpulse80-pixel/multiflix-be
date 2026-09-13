import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { MainTabBar } from './MainTabBar';
import {
  BloggingStackNavigator,
  HomeStackNavigator,
  MusicStackNavigator,
  ProfileStackNavigator,
  TrendingStackNavigator,
} from './tabStacks';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={MainTabBar}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen name="home" component={HomeStackNavigator} />
      <Tab.Screen name="trending" component={TrendingStackNavigator} />
      <Tab.Screen name="blogging" component={BloggingStackNavigator} />
      <Tab.Screen name="music" component={MusicStackNavigator} />
      <Tab.Screen name="profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
