import type { ProfileGridItem } from './publicUserProfileMock';

const G = (id: string, w = 720) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const GRID: ProfileGridItem[] = [
  {
    id: 'mp0',
    uri: G('1441974231531-c7827e6cb378'),
    span: 1.2,
    isVideo: true,
    views: 367_500,
  },
  {
    id: 'mp1',
    uri: G('1618005182384-a83a8bd57fbe'),
    span: 1.1,
    isVideo: true,
    views: 837_900,
  },
  {
    id: 'mp2',
    uri: G('1496181133206-80ce9b88a853'),
    span: 1.15,
    isVideo: true,
    views: 736_200,
  },
  {
    id: 'mp3',
    uri: G('1517694712202-14dd9538aa97'),
    span: 1,
    isVideo: false,
  },
  {
    id: 'mp4',
    uri: G('1460925895917-afdab827c52f'),
    span: 1.25,
    isVideo: false,
  },
  {
    id: 'mp5',
    uri: G('1550745165-10bc31ffb338'),
    span: 1.05,
    isVideo: true,
    views: 210_000,
  },
  {
    id: 'mp6',
    uri: G('1516321498327-e374a7c3d369'),
    span: 1.1,
    isVideo: false,
  },
  {
    id: 'mp7',
    uri: G('1504384308090-c54fd844e2d8'),
    span: 1.2,
    isVideo: false,
  },
  {
    id: 'mp8',
    uri: G('1522071820089-440f9a1a8220'),
    span: 1,
    isVideo: true,
    views: 92_400,
  },
];

const SAVED: ProfileGridItem[] = GRID.filter((_, i) => i % 2 === 0).map((c, i) => ({
  ...c,
  id: `sv-${i}`,
}));

export const MY_PROFILE_MOCK = {
  displayName: 'Andrew Ainsley',
  /** Header uses shortened label like the design. */
  headerTitle: 'Andrew..',
  handle: 'andrew_aisnley',
  bio: 'Designer & Videographer',
  avatarUri: G('1472099645785-5658abf4ff4e', 400),
  posts: 247,
  followers: 368_000,
  likes: 3_700_000,
  grid: GRID,
  savedGrid: SAVED,
} as const;
