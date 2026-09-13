import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';

export function VideoPlayground() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Video Player Playground</Text>
      <View style={styles.videoWrap}>
        <Video
          source={{ uri: 'https://www.w3schools.com/html/mov_bbb.mp4' }}
          style={styles.video}
          resizeMode="contain"
          controls
          paused={false}
          repeat
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  videoWrap: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
