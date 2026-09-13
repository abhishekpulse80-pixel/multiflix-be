import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import { MiniPlayer } from '../components/music/MiniPlayer';
import { MusicPlayerProvider } from '../context/MusicPlayerContext';
import { baseApi } from '../store/api/baseApi';
import { HomeFeedScreen } from '../screens/HomeFeedScreen';
import { TrendingScreen } from '../screens/TrendingScreen';
import { BloggingScreen } from '../screens/BloggingScreen';
import { BloggingWatchScreen } from '../screens/BloggingWatchScreen';
import { ArtistProfileScreen } from '../screens/ArtistProfileScreen';
import { MusicAlbumDetailScreen } from '../screens/MusicAlbumDetailScreen';
import { MusicFavouritesScreen } from '../screens/MusicFavouritesScreen';
import { MusicNowPlayingScreen } from '../screens/MusicNowPlayingScreen';
import { MusicScreen } from '../screens/MusicScreen';
import { MyProfileScreen } from '../screens/MyProfileScreen';
import type {
  BloggingStackParamList,
  HomeStackParamList,
  MusicStackParamList,
  PlaceholderStackParamList,
  TrendingStackParamList,
} from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TrendingStack = createNativeStackNavigator<TrendingStackParamList>();
const BloggingStack = createNativeStackNavigator<BloggingStackParamList>();
const MusicStack = createNativeStackNavigator<MusicStackParamList>();
const ProfileStack = createNativeStackNavigator<PlaceholderStackParamList>();

export function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeFeed" component={HomeFeedScreen} />
    </HomeStack.Navigator>
  );
}

export function TrendingStackNavigator() {
  return (
    <TrendingStack.Navigator screenOptions={{ headerShown: false }}>
      <TrendingStack.Screen name="TrendingHome" component={TrendingScreen} />
    </TrendingStack.Navigator>
  );
}

export function BloggingStackNavigator() {
  return (
    <BloggingStack.Navigator screenOptions={{ headerShown: false }}>
      <BloggingStack.Screen name="BloggingMain" component={BloggingScreen} />
      <BloggingStack.Screen name="BloggingWatch" component={BloggingWatchScreen} />
    </BloggingStack.Navigator>
  );
}

export function MusicStackNavigator() {
  const dispatch = useDispatch();

  useFocusEffect(
    useCallback(() => {
      dispatch(
        baseApi.util.invalidateTags([
          { type: 'Music', id: 'ALBUMS' },
          { type: 'Music', id: 'RECOMMENDED' },
          { type: 'Music', id: 'ARTISTS' },
        ]),
      );
    }, [dispatch]),
  );

  return (
    <MusicPlayerProvider>
      <View style={{ flex: 1 }}>
        <MusicStack.Navigator screenOptions={{ headerShown: false }}>
          <MusicStack.Screen name="MusicHome" component={MusicScreen} />
          <MusicStack.Screen name="MusicAlbumDetail" component={MusicAlbumDetailScreen} />
          <MusicStack.Screen
            name="MusicNowPlaying"
            component={MusicNowPlayingScreen}
            options={{ gestureEnabled: false }}
          />
          <MusicStack.Screen name="MusicFavourites" component={MusicFavouritesScreen} />
          <MusicStack.Screen name="ArtistProfile" component={ArtistProfileScreen} />
        </MusicStack.Navigator>
        <MiniPlayer />
      </View>
    </MusicPlayerProvider>
  );
}

export function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="MyProfile" component={MyProfileScreen} />
    </ProfileStack.Navigator>
  );
}
