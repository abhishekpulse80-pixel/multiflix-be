import { Share } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import { targetFromUrl } from '../src/utils/deepLinks';
import {
  profileUrl,
  shareMultiflixContent,
  shareProfile,
} from '../src/utils/shareProfile';

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    config: jest.fn(() => ({
      fetch: jest.fn(() => Promise.resolve({ path: () => '/tmp/profile-avatar.jpg' })),
    })),
    fs: {
      dirs: {
        CacheDir: '/tmp',
      },
      mkdir: jest.fn(() => Promise.resolve()),
    },
  },
}));

describe('shareProfile helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a native share sheet with the profile URL', async () => {
    await shareProfile({
      username: 'abhishek',
      fullName: 'Abhishek Singh',
      followersCount: 315,
      followingCount: 745,
    });

    expect(Share.share).toHaveBeenCalledWith(
      {
        message: 'Abhishek Singh\n@abhishek\n315 Followers, 745 Following\nhttps://multiflix.in/u/abhishek',
        url: 'https://multiflix.in/u/abhishek',
        title: 'Abhishek Singh on Multiflix',
      },
      { subject: 'Abhishek Singh on Multiflix' },
    );
  });

  it('attaches the user avatar to the share payload when available', async () => {
    await shareProfile({
      username: 'abhishek',
      fullName: 'Abhishek Singh',
      avatarUrl: 'https://images.example.com/avatar.jpg',
    });

    expect(RNBlobUtil.config).toHaveBeenCalled();
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('https://multiflix.in/u/abhishek'),
        title: 'Abhishek Singh on Multiflix',
        url: 'file:///tmp/profile-avatar.jpg',
      }),
      { subject: 'Abhishek Singh on Multiflix' },
    );
  });

  it('builds a deep link for a shared music item', async () => {
    await shareMultiflixContent({
      kind: 'music',
      id: 'music-42',
      title: 'Night Drive',
      author: 'Aditi',
      username: 'aditi',
    });

    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('https://multiflix.in/m/music-42'),
        url: 'https://multiflix.in/m/music-42',
        title: 'Night Drive on Multiflix',
      }),
      { subject: 'Night Drive on Multiflix' },
    );
  });

  it.each([
    ['video', 'video-42', 'Short clip', 'https://multiflix.in/v/video-42'],
    ['blog', 'blog-42', 'Long-form story', 'https://multiflix.in/b/blog-42'],
  ] as const)('builds a deep link for a shared %s item', async (kind, id, title, url) => {
    await shareMultiflixContent({ kind, id, title });

    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(url),
        url,
        title: `${title} on Multiflix`,
      }),
      { subject: `${title} on Multiflix` },
    );
  });

  it.each([
    ['https://multiflix.in/u/abhishek', { kind: 'profile', value: 'abhishek' }],
    ['https://multiflix.in/m/music-42', { kind: 'music', value: 'music-42' }],
    ['https://multiflix.in/b/blog-42', { kind: 'blog', value: 'blog-42' }],
    ['https://multiflix.in/v/6a7553c23dc33d3f9338e089', { kind: 'video', value: '6a7553c23dc33d3f9338e089' }],
    ['https://www.multiflix.in/u/abhishek', { kind: 'profile', value: 'abhishek' }],
    ['multiflix://v/6a7553c23dc33d3f9338e089', { kind: 'video', value: '6a7553c23dc33d3f9338e089' }],
  ] as const)('parses the shared Multiflix URL %s', (url, expected) => {
    expect(targetFromUrl(url)).toEqual(expected);
  });

  it('encodes usernames in the public profile URL', () => {
    expect(profileUrl('deep@user')).toBe(
      'https://multiflix.in/u/deep%40user',
    );
  });

  it('uses the same public URL contract for usernames with spaces', () => {
    expect(profileUrl('deep user')).toBe(
      'https://multiflix.in/u/deep%20user',
    );
  });
});