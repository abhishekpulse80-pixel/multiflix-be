import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import type { ProfileGridItem } from '../../data/publicUserProfileMock';
import { formatCount } from '../../utils/formatCount';

const GAP = 5;

function PlayCornerIcon({
  size = 10,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7L8 5z" />
    </Svg>
  );
}

type Props = {
  items: ProfileGridItem[];
  colW: number;
  /**
   * `masonry`: three columns with varied tile heights (`span`).
   * `grid`: uniform square cells, left-to-right then next row (e.g. other users’ profiles).
   */
  layout?: 'masonry' | 'grid';
  onPressItem?: (item: ProfileGridItem, index: number) => void;
  onLongPressItem?: (item: ProfileGridItem, index: number) => void;
};

// Memoized so a parent re-render (tab switch, follow toggle, load-more append)
// doesn't re-render every already-mounted tile. Handlers are passed as the
// stable onPressItem/onLongPressItem refs + item/index (bound inside) rather
// than a fresh arrow per tile, which would defeat the memo.
const PostTile = React.memo(function PostTile({
  item,
  index,
  colW,
  height,
  marginBottom = GAP,
  onPressItem,
  onLongPressItem,
}: {
  item: ProfileGridItem;
  index: number;
  colW: number;
  height: number;
  /** Grid layout uses parent `gap` only — set `0`. */
  marginBottom?: number;
  onPressItem?: (item: ProfileGridItem, index: number) => void;
  onLongPressItem?: (item: ProfileGridItem, index: number) => void;
}) {
  const onPress = onPressItem ? () => onPressItem(item, index) : undefined;
  const onLongPress = onLongPressItem
    ? () => onLongPressItem(item, index)
    : undefined;
  // Likes count is intentionally not shown on grid tiles; videos keep their
  // play/view count.
  return (
    <Pressable
      style={[styles.tileWrap, marginBottom > 0 ? { marginBottom } : null]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={onPress == null && onLongPress == null}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Open post' : undefined}
    >
      {item.uri ? (
        <FastImage
          source={{ uri: item.uri, priority: FastImage.priority.normal }}
          style={[styles.tileImage, { width: colW, height }]}
          resizeMode={FastImage.resizeMode.cover}
          accessibilityLabel="Post"
        />
      ) : (
        <View style={[styles.tileImage, styles.videoPlaceholder, { width: colW, height }]} />
      )}
      {item.views != null ? (
        <View style={styles.tileOverlay} pointerEvents="none">
          <PlayCornerIcon size={12} color="#FFFFFF" />
          <Text style={styles.tileViews}>{formatCount(item.views)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

export function ProfileMasonry({
  items,
  colW,
  layout = 'masonry',
  onPressItem,
  onLongPressItem,
}: Props) {
  // Defensive dedupe by id: duplicate ids (e.g. overlapping paginated pages)
  // would create duplicate React keys → a Fabric "child already has a parent"
  // mount crash.
  const seenIds = new Set<string>();
  const safeItems = items.filter(it => {
    if (seenIds.has(it.id)) {
      return false;
    }
    seenIds.add(it.id);
    return true;
  });
  if (layout === 'grid') {
    /** Fixed 4:5 aspect ratio for all tiles — matches Instagram grid. */
    const tileH = Math.round(colW * 1.25);
    return (
      <View style={styles.gridWrap}>
        {safeItems.map((item, index) => (
          <View key={item.id} style={{ width: colW }}>
            <PostTile
              item={item}
              index={index}
              colW={colW}
              height={tileH}
              marginBottom={0}
              onPressItem={onPressItem}
              onLongPressItem={onLongPressItem}
            />
          </View>
        ))}
      </View>
    );
  }

  const cols: ProfileGridItem[][] = [[], [], []];
  safeItems.forEach((it, i) => {
    cols[i % 3].push(it);
  });

  return (
    <View style={styles.masonryRow}>
      {cols.map((col, ci) => (
        <View key={ci} style={[styles.masonryCol, { width: colW }]}>
          {col.map(item => (
            <PostTile
              key={item.id}
              item={item}
              index={0}
              colW={colW}
              height={colW * item.span}
              marginBottom={GAP}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const BLUE = '#246BFD';

const styles = StyleSheet.create({
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  masonryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GAP,
  },
  masonryCol: {},
  tileWrap: {
    overflow: 'hidden',
    backgroundColor: '#EEF0F4',
    borderRadius: 4,
  },
  tileImage: {
    borderRadius: 4,
  },
  videoPlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOverlay: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playDisc: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileViews: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
