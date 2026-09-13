import type { AuthUserDto } from '../types/authApi';
import type { RootStackParamList } from './types';

export type OnboardingFlowScreen = Extract<
  keyof RootStackParamList,
  'ChooseInterests' | 'FillProfile'
>;

type OnboardingUserSnapshot = Pick<
  AuthUserDto,
  'email' | 'fullName' | 'interests' | 'isOnboarded'
>;

/**
 * Resume onboarding from the first step that profile data says is missing.
 * Flow: fill profile (name + email) → choose interests, which is the LAST step
 * and finalizes onboarding (`isOnboarded` stays false until interests saved).
 */
export function getFirstIncompleteOnboardingScreen(
  user: OnboardingUserSnapshot,
): OnboardingFlowScreen {
  if (!user?.email || !user?.fullName) {
    return 'FillProfile';
  }
  return 'ChooseInterests';
}
