import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { useChatSocketConnection } from '../hooks/useChatSocketConnection';
import { useProfileDeepLinks } from '../hooks/useProfileDeepLinks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rootNavigationRef } from './rootNavigationRef';
import { ForgotPasswordOtpScreen } from '../screens/auth/ForgotPasswordOtpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LetsYouInScreen } from '../screens/auth/LetsYouInScreen';
import { ResetNewPasswordScreen } from '../screens/auth/ResetNewPasswordScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { FillProfileScreen } from '../screens/onboarding/FillProfileScreen';
import { ChooseInterestsScreen } from '../screens/onboarding/ChooseInterestsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { SplashScreen } from '../screens/SplashScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { BlockedUsersScreen } from '../screens/BlockedUsersScreen';
import { SavedPostsScreen } from '../screens/SavedPostsScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { TrendingPostsViewerScreen } from '../screens/TrendingPostsViewerScreen';
import { UserProfilePostsViewerScreen } from '../screens/UserProfilePostsViewerScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { FollowersListScreen } from '../screens/FollowersListScreen';
import { MediaPreviewScreen } from '../screens/MediaPreviewScreen';
import { CreateBlogScreen } from '../screens/CreateBlogScreen';
import { CreatePostScreen } from '../screens/CreatePostScreen';
import { HashtagFeedScreen } from '../screens/HashtagFeedScreen';
import { MusicFeedScreen } from '../screens/MusicFeedScreen';
import { SoundDetailScreen } from '../screens/SoundDetailScreen';
import { StoryPreviewScreen } from '../screens/StoryPreviewScreen';
import { StoryViewerScreen } from '../screens/StoryViewerScreen';
import { BankAccountScreen } from '../screens/BankAccountScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { HiddenChatsScreen } from '../screens/HiddenChatsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { WithdrawRequestScreen } from '../screens/WithdrawRequestScreen';
import { VideoPlayground } from '../screens/VideoPlayground';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0D0D0D',
    border: '#E8E8E8',
    primary: '#246BFD',
  },
};

/**
 * Routes that draw a DARK background under the status bar. These get a black
 * safe-area band + light-content (white) status-bar icons. Every other route
 * is treated as a light background → white band + dark-content icons.
 *
 * This is the single source of truth for status-bar appearance app-wide;
 * individual screens no longer set the status bar themselves.
 */
const DARK_SAFE_AREA_ROUTES = new Set([
  'Splash',
  'StoryViewer',
  'StoryPreview',
  'MediaPreview',
  'CreateBlog', // black top header
  'TrendingPostsViewer',
  'UserProfilePostsViewer',
  // Home tab — leaf route name from the bottom tabs / inner stacks.
  'HomeFeed',
  'home',
  // Blogging tab is black-themed (main list + the watch/player screen).
  'BloggingMain',
  'BloggingWatch',
  // Music "Now Playing" is black-themed.
  'MusicNowPlaying',
]);

/**
 * Walk the navigation state to the deepest active route. The root navigator's
 * `state.routes[state.index]` only gives us the top-level route (e.g. 'Main'),
 * which doesn't tell us which tab is focused on the bottom-tabs navigator.
 */
function getActiveLeafRoute(
  state: ReturnType<NonNullable<typeof rootNavigationRef.getRootState>> | undefined,
): string | undefined {
  if (!state) return undefined;
  let current: any = state;
  while (current?.routes && typeof current.index === 'number') {
    const route = current.routes[current.index];
    if (!route) break;
    if (!route.state) {
      return route.name;
    }
    current = route.state;
  }
  return undefined;
}

export function RootNavigator() {
  useChatSocketConnection();
  const [activeRoute, setActiveRoute] = useState<string | undefined>(undefined);
  const [navReady, setNavReady] = useState(false);

  // Open shared profile links (multiflix.in/u/<username>) inside the app.
  useProfileDeepLinks(navReady);

  const isDarkTop = !!activeRoute && DARK_SAFE_AREA_ROUTES.has(activeRoute);
  const safeAreaBg = isDarkTop ? '#000000' : '#FFFFFF';

  return (
    <NavigationContainer
      ref={rootNavigationRef}
      theme={navTheme}
      onReady={() => {
        setNavReady(true);
        setActiveRoute(rootNavigationRef.getCurrentRoute()?.name);
      }}
      onStateChange={state => {
        setActiveRoute(getActiveLeafRoute(state));
      }}>
      {/* App-wide status bar — the single source of truth. iOS only honours
          barStyle (backgroundColor is ignored there); Android uses both.
          Dark-background routes get white icons, everything else dark icons. */}
      <StatusBar
        barStyle={isDarkTop ? 'light-content' : 'dark-content'}
        backgroundColor={safeAreaBg}
        translucent={false}
        animated
      />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: safeAreaBg }}
        edges={['top', 'left', 'right', 'bottom']}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="LetsYouIn" component={LetsYouInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ChooseInterests" component={ChooseInterestsScreen} />
          <Stack.Screen name="FillProfile" component={FillProfileScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtpScreen} />
          <Stack.Screen name="ResetNewPassword" component={ResetNewPasswordScreen} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="SavedPosts" component={SavedPostsScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />
          <Stack.Screen
            name="UserProfilePostsViewer"
            component={UserProfilePostsViewerScreen}
          />
          <Stack.Screen
            name="TrendingPostsViewer"
            component={TrendingPostsViewerScreen}
          />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="FollowersList" component={FollowersListScreen} />
          <Stack.Screen name="MediaPreview" component={MediaPreviewScreen} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} />
          <Stack.Screen name="CreateBlog" component={CreateBlogScreen} />
          <Stack.Screen
            name="StoryViewer"
            component={StoryViewerScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen name="StoryPreview" component={StoryPreviewScreen} />
          <Stack.Screen name="BankAccount" component={BankAccountScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="HiddenChats" component={HiddenChatsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen
            name="WithdrawRequest"
            component={WithdrawRequestScreen}
          />
          <Stack.Screen name="VideoPlayground" component={VideoPlayground} />
          <Stack.Screen name="HashtagFeed" component={HashtagFeedScreen} />
          <Stack.Screen name="MusicFeed" component={MusicFeedScreen} />
          <Stack.Screen name="SoundDetail" component={SoundDetailScreen} />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
