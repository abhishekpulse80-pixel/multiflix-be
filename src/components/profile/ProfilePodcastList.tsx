import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import type { ProfileGridItem } from '../../data/publicUserProfileMock';
import { formatCount } from '../../utils/formatCount';
import { formatDuration } from '../../utils/formatDuration';
import { formatBlogPublishedLabel } from '../../utils/formatBlogPublishedLabel';
import { useTheme } from '../../theme';

const TITLE = '#0D0D0D';
const MUTED = '#6B6B6B';

function PlayGlyph({ size = 13, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7L8 5z" />
    </Svg>
  );
}

function MoreDotsIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
    </Svg>
  );
}

type Props = {
  items: ProfileGridItem[];
  onPressItem?: (item: ProfileGridItem, index: number) => void;
  /**
   * When provided, each row gets an overflow button and a long-press that
   * fire this (own profile → delete). Omitted on other users' profiles.
   */
  onMoreItem?: (item: ProfileGridItem, index: number) => void;
};

// Memoized so a parent re-render (tab switch, load-more append) doesn't
// re-render every mounted episode row. Props are primitives + stable refs, so
// the default shallow compare is safe here.
const EpisodeRow = React.memo(function EpisodeRow({
  item,
  index,
  onPress,
  onMore,
  semibold,
  regular,
  isLast,
}: {
  item: ProfileGridItem;
  index: number;
  onPress?: (item: ProfileGridItem, index: number) => void;
  onMore?: (item: ProfileGridItem, index: number) => void;
  semibold: string;
  regular: string;
  isLast: boolean;
}) {
  const duration = formatDuration(item.durationSeconds);
  const views = item.views ?? 0;
  const plays = `${formatCount(views)} ${views === 1 ? 'play' : 'plays'}`;
  const dateLabel = formatBlogPublishedLabel(item.publishedAt ?? null);
  const metaLine = dateLabel ? `${plays} · ${dateLabel}` : plays;

  return (
    <Pressable
      style={[styles.row, isLast && styles.rowLast]}
      onPress={() => onPress?.(item, index)}
      onLongPress={onMore ? () => onMore(item, index) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title ?? 'podcast episode'}`}
    >
      <View style={styles.thumbWrap}>
        <FastImage
          source={{ uri: item.uri }}
          style={styles.thumb}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.playBadge}>
          <PlayGlyph size={11} />
        </View>
        {duration ? (
          <View style={styles.durationPill}>
            <Text style={[styles.durationText, { fontFamily: semibold }]}>
              {duration}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text
          numberOfLines={2}
          style={[styles.title, { fontFamily: semibold }]}
        >
          {item.title?.trim() || 'Untitled episode'}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.sub, { fontFamily: regular }]}
        >
          {metaLine}
        </Text>
      </View>

      {onMore ? (
        <Pressable
          hitSlop={10}
          onPress={() => onMore(item, index)}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel="Episode options"
        >
          <MoreDotsIcon color={MUTED} />
        </Pressable>
      ) : null}
    </Pressable>
  );
});

export function ProfilePodcastList({ items, onPressItem, onMoreItem }: Props) {
  const t = useTheme();
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <EpisodeRow
          key={item.id}
          item={item}
          index={index}
          onPress={onPressItem}
          onMore={onMoreItem}
          semibold={t.fontFamily.semibold}
          regular={t.fontFamily.regular}
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );
}

const THUMB = 68;

const styles = StyleSheet.create({
  list: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EFEFEF',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  durationPill: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: TITLE,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  sub: {
    color: MUTED,
    fontSize: 12,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
