import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { InterestChip } from '../../components/auth/InterestChip';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AccountReadySuccessModal } from '../../components/auth/AccountReadySuccessModal';
import type { RootStackParamList } from '../../navigation/types';
import {
  selectCurrentUser,
  useAppSelector,
  useCompleteOnboardingMutation,
  useUpdateOnboardingInterestsMutation,
} from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ChooseInterests'>;

const LINK = '#246BFD';

const INTEREST_LABELS = [
  'Entertainment',
  'Gaming',
  'Art',
  'Animals',
  'Comedy',
  'Dance',
  'Beauty',
  'Music',
  'Food & Drink',
  'Sports',
  'DIY',
  'Science & Education',
  'Travel',
  'Family',
  'Anime & Movie',
  'Technology',
  'Outdoors',
  'Culture',
  'Health',
  'Comics',
] as const;

const STATIC_LABELS = INTEREST_LABELS as readonly string[];

const DEFAULT_SELECTED = new Set<string>([
  'Entertainment',
  'Comedy',
  'Beauty',
  'Sports',
  'Science & Education',
  'Anime & Movie',
  'Outdoors',
  'Culture',
]);

export function ChooseInterestsScreen({ navigation }: Props) {
  const t = useTheme();
  const user = useAppSelector(selectCurrentUser);
  const hydratedFromProfile = useRef(false);
  const [updateInterests, { isLoading: savingInterests }] =
    useUpdateOnboardingInterestsMutation();
  const [completeOnboarding, { isLoading: completingOnboarding }] =
    useCompleteOnboardingMutation();
  const [successOpen, setSuccessOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const chipLabels = useMemo(() => {
    const extras = new Set<string>();
    for (const raw of user?.interests ?? []) {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (s && !STATIC_LABELS.includes(s)) {
        extras.add(s);
      }
    }
    const rest = [...extras].sort((a, b) => a.localeCompare(b));
    return [...INTEREST_LABELS, ...rest];
  }, [user?.interests]);

  useEffect(() => {
    if (hydratedFromProfile.current || !user) {
      return;
    }
    hydratedFromProfile.current = true;
    const fromApi = user.interests.map(s => s.trim()).filter(Boolean);
    setSelected(
      fromApi.length > 0 ? new Set(fromApi) : new Set(DEFAULT_SELECTED),
    );
  }, [user]);

  const titleFont = useMemo(
    () => ({ fontFamily: t.fontFamily.bold }),
    [t.fontFamily.bold],
  );

  const toggle = (label: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const persistAndNext = async () => {
    try {
      await updateInterests({ interests: Array.from(selected) }).unwrap();
      // Interests is the final onboarding step — finalize and show success.
      await completeOnboarding().unwrap();
      setSuccessOpen(true);
    } catch (e: unknown) {
      toastError('Could not save interests', getApiErrorMessage(e));
    }
  };

  const continueBtnStyle = [
    styles.continueBtn,
    {
      backgroundColor: LINK,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#FFAABE',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 18,
          }
        : { elevation: 10 }),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        title="Choose Your Interest"
        titleStyle={titleFont}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { fontFamily: t.fontFamily.regular }]}>
          Choose your interests and get the best video recommendations.
        </Text>

        <View style={styles.chips}>
          {chipLabels.map(label => (
            <InterestChip
              key={label}
              label={label}
              selected={selected.has(label)}
              onToggle={() => toggle(label)}
              fontFamily={t.fontFamily.medium}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: 24 }]}>
        <View style={styles.half}>
          <PrimaryButton
            elevated
            label={
              savingInterests || completingOnboarding ? 'Saving…' : 'Continue'
            }
            disabled={savingInterests || completingOnboarding}
            onPress={persistAndNext}
            labelStyle={{ fontFamily: t.fontFamily.bold }}
            style={continueBtnStyle}
          />
        </View>
      </View>
      <AccountReadySuccessModal visible={successOpen} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#0A0A0A',
    marginBottom: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  half: {
    flex: 1,
  },
  continueBtn: {
    width: '100%',
  },
});
