export type TrendingSearchUser = {
  id: string;
  name: string;
  handle: string;
  avatarUri: string;
};

const AV = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=200&q=80`;

/** Dummy creators for Trending search (names/handles filter client-side). */
export const TRENDING_SEARCH_USERS: TrendingSearchUser[] = [
  {
    id: 'u1',
    name: 'Kristin Watson',
    handle: 'kristin_w',
    avatarUri: AV('1494790108377-be9c29b29330'),
  },
  {
    id: 'u2',
    name: 'Ralph Edwards',
    handle: 'ralph_e',
    avatarUri: AV('1507003211169-0a1dd7228f2d'),
  },
  {
    id: 'u3',
    name: 'Kathryn Murphy',
    handle: 'kat_m',
    avatarUri: AV('1438761681033-6461ffad8d80'),
  },
  {
    id: 'u4',
    name: 'Jenny Wilson',
    handle: 'jennyw',
    avatarUri: AV('1534528741775-53994a69daeb'),
  },
  {
    id: 'u5',
    name: 'Courtney Henry',
    handle: 'courtneyh',
    avatarUri: AV('1544005313-94ddf0286df2'),
  },
  {
    id: 'u6',
    name: 'Darrell Steward',
    handle: 'darrell_s',
    avatarUri: AV('1500648767791-00dcc994a43e'),
  },
  {
    id: 'u7',
    name: 'Annette Black',
    handle: 'annette_b',
    avatarUri: AV('1524504388940-b1c1722653e1'),
  },
  {
    id: 'u8',
    name: 'Brooklyn Simmons',
    handle: 'brooklyn',
    avatarUri: AV('1517841905240-472988babdf9'),
  },
  {
    id: 'u9',
    name: 'Marvin McKinney',
    handle: 'marvinm',
    avatarUri: AV('1529626455594-4ff0802cfb7e'),
  },
  {
    id: 'u10',
    name: 'Leslie Alexander',
    handle: 'leslie_a',
    avatarUri: AV('1502823403499-6ccfcf4fb453'),
  },
  {
    id: 'u11',
    name: 'Jacob Jones',
    handle: 'jacobj',
    avatarUri: AV('1472099645785-5658abf4ff4e'),
  },
  {
    id: 'u12',
    name: 'Eleanor Pena',
    handle: 'eleanor_p',
    avatarUri: AV('1487412720507-e7ab37603c6f'),
  },
];
