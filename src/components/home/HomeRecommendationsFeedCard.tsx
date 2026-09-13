import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { UserAvatar } from '../common/UserAvatar';
import type { RecommendationUser } from '../../types/homeFeed';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';
import { FollowUserPlusIcon } from '../icons/FeedActionIcons';

const AVATAR = 100;
const SCREEN_PAD = 14;
const CELL_PAD = 10;

type Props = {
  width: number;
  height: number;
  topInset: number;
  tabBarReserve: number;
  users: RecommendationUser[];
  onPressUser?: (userId: string) => void;
  /** Map of userId -> isFollowing. Owned by the parent screen so it survives
   *  the card unmounting while the feed scrolls. */
  followedIds?: Record<string, boolean>;
  /** userIds with an in-flight follow/unfollow request. */
  busyIds?: Set<string>;
  onToggleFollow?: (userId: string) => void;
};

function chunkPairs<T>(list: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2));
  }
  return rows;
}

export const HomeRecommendationsFeedCard = React.memo(function HomeRecommendationsFeedCard({
  width,
  height,
  topInset,
  tabBarReserve,
  users,
  onPressUser,
  followedIds,
  busyIds,
  onToggleFollow,
}: Props) {
  const t = useTheme();
  const rows = useMemo(() => chunkPairs(users), [users]);

  return (
    <View style={[styles.root, { width, height }]}>
      <View
        style={[
          styles.inner,
          {
            paddingTop: topInset + 8,
            paddingBottom: tabBarReserve + 10,
            paddingHorizontal: SCREEN_PAD,
          },
        ]}
      >
        <Text
          style={[styles.title, { fontFamily: t.fontFamily.semibold }]}
          accessibilityRole="header"
        >
          Friend Recommendations
        </Text>
        <View style={styles.grid}>
          {rows.map((pair, rowIndex) => (
            <View key={`row-${String(rowIndex)}`} style={styles.row}>
              {pair.map(user => {
                const following = followedIds?.[user.id] ?? false;
                const busy = busyIds?.has(user.id) ?? false;
                return (
                  <View key={user.id} style={styles.cell}>
                    <Pressable
                      onPress={() => onPressUser?.(user.id)}
                      style={styles.avatarPress}
                      accessibilityLabel={`${user.handle} profile`}
                      accessibilityRole="button"
                    >
                      <UserAvatar uri={user.avatarUri} style={styles.avatar} />
                    </Pressable>
                    <Text
                      style={[
                        styles.handle,
                        { fontFamily: t.fontFamily.semibold },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      @{user.handle}
                    </Text>
                    <Pressable
                      onPress={() => onToggleFollow?.(user.id)}
                      disabled={busy}
                      style={[
                        styles.followBtn,
                        following && styles.followBtnFollowing,
                      ]}
                      accessibilityLabel={`${
                        following
                          ? 'Unfollow'
                          : user.followsYou
                            ? 'Follow back'
                            : 'Follow'
                      } ${user.handle}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: following }}
                    >
                      {busy ? (
                        <ActivityIndicator
                          size="small"
                          color={following ? palette.brandBlue : palette.white}
                        />
                      ) : (
                        <>
                          {!following ? (
                            <FollowUserPlusIcon
                              size={14}
                              color={palette.white}
                            />
                          ) : null}
                          <Text
                            style={[
                              styles.followLabel,
                              { fontFamily: t.fontFamily.semibold },
                              following && styles.followLabelFollowing,
                            ]}
                          >
                            {following
                              ? 'Following'
                              : user.followsYou
                                ? 'Follow Back'
                                : 'Follow'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.white,
  },
  inner: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    color: palette.black,
    textAlign: 'center',
    marginTop: 10,
  },
  grid: {
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: CELL_PAD,
    paddingVertical: 8,
  },
  avatarPress: {
    marginBottom: 4,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: palette.gray200,
  },
  handle: {
    fontSize: 12,
    color: palette.black,
    marginBottom: 6,
    textAlign: 'center',
    width: '100%',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: palette.brandBlue,
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 34,
    borderWidth: 1.5,
    borderColor: palette.brandBlue,
  },
  followBtnFollowing: {
    backgroundColor: palette.white,
  },
  followLabel: {
    fontSize: 12,
    color: palette.white,
    marginLeft: 4,
    flexShrink: 1,
  },
  followLabelFollowing: {
    color: palette.brandBlue,
    marginLeft: 0,
  },
});
