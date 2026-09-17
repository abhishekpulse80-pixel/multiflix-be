import { mapFeedPostDtoToFeedPostData } from '../src/utils/mapFeedPostToUi';

describe('media API behavior', () => {
  it('prefers the HLS master URL once video processing is ready', () => {
    const mapped = mapFeedPostDtoToFeedPostData({
      id: 'p1',
      authorId: 'u1',
      authorUsername: 'alice',
      authorFullName: 'Alice',
      authorAvatarUrl: null,
      mediaKind: 'short_video',
      media: {
        key: 'uploads/u1/video.mp4',
        bucket: 'bucket',
        contentType: 'video/mp4',
        size: 1024,
        originalName: 'video.mp4',
        url: 'https://cdn.example.com/uploads/u1/video.mp4',
      },
      mediaProcessingStatus: 'ready',
      hlsUrl: 'https://cdn.example.com/uploads/u1/hls/master.m3u8',
      thumbnailUrl: null,
      caption: 'hi',
      hashtags: '#tag',
      musicTitle: null,
      music: null,
      originalSound: null,
      originalAudioMuted: false,
      mediaWidth: 1080,
      mediaHeight: 1920,
      durationSeconds: 24,
      likesCount: 10,
      commentsCount: 2,
      likedByViewer: false,
      savedByViewer: false,
      createdAt: '2026-09-13T00:00:00.000Z',
      updatedAt: '2026-09-13T00:00:00.000Z',
    });

    expect(mapped.isVideo).toBe(true);
    expect(mapped.imageUri).toBe('https://cdn.example.com/uploads/u1/hls/master.m3u8');
  });

  it('keeps the original uploaded media while processing is still in flight', () => {
    const mapped = mapFeedPostDtoToFeedPostData({
      id: 'p2',
      authorId: 'u2',
      authorUsername: 'bob',
      authorFullName: 'Bob',
      authorAvatarUrl: null,
      mediaKind: 'short_video',
      media: {
        key: 'uploads/u2/video.mp4',
        bucket: 'bucket',
        contentType: 'video/mp4',
        size: 1024,
        originalName: 'video.mp4',
        url: 'https://cdn.example.com/uploads/u2/video.mp4',
      },
      mediaProcessingStatus: 'processing',
      hlsUrl: null,
      thumbnailUrl: null,
      caption: 'hi',
      hashtags: '#tag',
      musicTitle: null,
      music: null,
      originalSound: null,
      originalAudioMuted: false,
      mediaWidth: 1080,
      mediaHeight: 1920,
      durationSeconds: 30,
      likesCount: 10,
      commentsCount: 2,
      likedByViewer: false,
      savedByViewer: false,
      createdAt: '2026-09-13T00:00:00.000Z',
      updatedAt: '2026-09-13T00:00:00.000Z',
    });

    expect(mapped.imageUri).toBe('https://cdn.example.com/uploads/u2/video.mp4');
  });

});
