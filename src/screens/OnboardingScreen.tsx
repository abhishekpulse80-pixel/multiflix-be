import React, { useCallback, useRef, useState } from 'react';
import {
  CommonActions } from '@react-navigation/native';
import { Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Intro1Illustration from '../../assets/svg/intro1.svg';
import Intro2Illustration from '../../assets/svg/intro2.svg';
import Intro3Illustration from '../../assets/svg/intro3.svg';
import { PaginationIndicator } from '../components/PaginationIndicator';
import { PrimaryButton } from '../components/PrimaryButton';
import type { OnboardingScreenProps } from '../navigation/types';
import { useTheme } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 24;
const ILLU_W = SCREEN_W - H_PAD * 2;

type Slide = {
  key: string;
  title: string;
  Illustration: React.ComponentType<{ width: number; height: number }>;
  height: number;
};

const SLIDES: Slide[] = [
  {
    key: 'w1',
    title: 'Watch interesting videos from around the world',
    Illustration: Intro2Illustration,
    height: ILLU_W * (294 / 340),
  },
  {
    key: 'w2',
    title: 'Find your friends and play together on social media',
    Illustration: Intro1Illustration,
    height: ILLU_W * (100 / 134) * 2.4,
  },
  {
    key: 'w3',
    title: "Let's have fun with your friends & Multiflix right now!",
    Illustration: Intro3Illustration,
    height: ILLU_W * (340 / 300),
  },
];

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const t = useTheme();
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  const onNext = useCallback(() => {
    if (page < SLIDES.length - 1) {
      pagerRef.current?.setPage(page + 1);
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LetsYouIn' }],
        }),
      );
    }
  }, [navigation, page]);

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => setPage(e.nativeEvent.position)}
      >
        {SLIDES.map(slide => {
          const Comp = slide.Illustration;
          return (
            <View key={slide.key} collapsable={false} style={styles.pageOuter}>
              <View style={styles.page}>
                <View style={styles.illustrationWrap}>
                  <Comp width={ILLU_W} height={slide.height} />
                </View>
                <Text
                  style={[
                    styles.headline,
                    {
                      color: t.colors.textPrimary,
                      fontFamily: t.fontFamily.bold,
                    },
                  ]}
                >
                  {slide.title}
                </Text>
              </View>
            </View>
          );
        })}
      </PagerView>

      <View
        style={[styles.footer, { paddingBottom: 24, paddingHorizontal: H_PAD }]}
      >
        <View style={styles.paginationWrap}>
          <PaginationIndicator count={SLIDES.length} activeIndex={page} />
        </View>
        <PrimaryButton
          label={page === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageOuter: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: H_PAD,
    justifyContent: 'center',
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    minHeight: ILLU_W * 0.85,
  },
  headline: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 8,
    gap: 20,
  },
  paginationWrap: {
    alignItems: 'center',
  },
});
