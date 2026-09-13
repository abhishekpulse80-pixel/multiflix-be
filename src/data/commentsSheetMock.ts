export type SheetComment = {
  id: string;
  userName: string;
  avatarUri: string;
  body: string;
};

const AV =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80';
const AV2 =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80';
const AV3 =
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';

/** Static rows for the comments bottom sheet demo. */
export const SHEET_COMMENTS_DUMMY: SheetComment[] = [
  {
    id: 'c1',
    userName: 'Kristin Watson',
    avatarUri: AV,
    body: LOREM,
  },
  {
    id: 'c2',
    userName: 'Ralph Edwards',
    avatarUri: AV2,
    body: LOREM,
  },
  {
    id: 'c3',
    userName: 'Kathryn Murphy',
    avatarUri: AV3,
    body: LOREM,
  },
  {
    id: 'c4',
    userName: 'Kristin Watson',
    avatarUri: AV,
    body: LOREM,
  },
  {
    id: 'c5',
    userName: 'Ralph Edwards',
    avatarUri: AV2,
    body: LOREM,
  },
];
