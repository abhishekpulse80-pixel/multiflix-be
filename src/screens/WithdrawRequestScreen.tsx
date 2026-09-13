import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import { useGetBankAccountQuery } from '../store/api/authApi';
import { useGetWalletQuery } from '../store/api/earningsApi';
import {
  useCreateWithdrawalRequestMutation,
  useGetWithdrawalSettingsQuery,
} from '../store/api/withdrawalApi';
import { useTheme } from '../theme';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError, toastSuccess } from '../utils/toast';

const BG = '#F6F7FB';
const CARD_BG = '#FFFFFF';
const BLUE = '#246BFD';
const TITLE = '#0D0D0D';
const MUTED = '#8E8E93';
const BORDER = '#EEF0F3';
const H_PAD = 20;

type Props = NativeStackScreenProps<RootStackParamList, 'WithdrawRequest'>;

function ChevronBack({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatInr(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return `₹${safe.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Mask all but the last 4 digits of an account number. */
function maskAccount(acc: string): string {
  if (acc.length <= 4) return acc;
  const last4 = acc.slice(-4);
  return `•••• ${last4}`;
}

export function WithdrawRequestScreen({ navigation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const { data: walletData, isLoading: walletLoading } = useGetWalletQuery();
  const { data: settingsData, isLoading: settingsLoading } =
    useGetWithdrawalSettingsQuery();
  const { data: bankData, isLoading: bankLoading } = useGetBankAccountQuery();
  const [createRequest, { isLoading: submitting }] =
    useCreateWithdrawalRequestMutation();

  const [amountInput, setAmountInput] = useState('');

  React.useEffect(() => {
    if (Platform.OS === 'android') {
    }
  }, []);

  const walletBalance = walletData?.walletBalance ?? 0;
  const minimumAmount = settingsData?.minimumAmount ?? 0;
  const bankAccount = bankData?.bankAccount ?? null;

  const amountNumber = useMemo(() => {
    const n = Number(amountInput);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [amountInput]);

  const amountError: string | null = useMemo(() => {
    if (!amountInput) return null;
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return 'Enter a valid amount.';
    }
    if (amountNumber < minimumAmount) {
      return `Minimum withdrawal is ${formatInr(minimumAmount)}.`;
    }
    if (amountNumber > walletBalance) {
      return 'Amount exceeds your current balance.';
    }
    return null;
  }, [amountInput, amountNumber, minimumAmount, walletBalance]);

  const canSubmit =
    !submitting &&
    !!bankAccount &&
    Number.isFinite(amountNumber) &&
    amountNumber >= minimumAmount &&
    amountNumber <= walletBalance;

  const handleSetMax = useCallback(() => {
    if (walletBalance <= 0) return;
    setAmountInput(String(walletBalance));
  }, [walletBalance]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    try {
      await createRequest({ amount: amountNumber }).unwrap();
      toastSuccess(
        'Request submitted',
        'Your withdrawal request is pending approval.',
      );
      navigation.goBack();
    } catch (e: unknown) {
      toastError('Could not submit', getApiErrorMessage(e));
    }
  }, [canSubmit, createRequest, amountNumber, navigation]);

  const loading = walletLoading || settingsLoading || bankLoading;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.topIcon}
          accessibilityLabel="Back"
          accessibilityRole="button">
          <ChevronBack />
        </Pressable>
        <Text style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]}>
          Withdraw
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={BLUE} />
          </View>
        ) : (
          <>
            {/* Balance card */}
            <View style={styles.balanceCard}>
              <Text
                style={[styles.balanceLabel, { fontFamily: t.fontFamily.medium }]}>
                Available Balance
              </Text>
              <Text
                style={[styles.balanceAmount, { fontFamily: t.fontFamily.bold }]}>
                {formatInr(walletBalance)}
              </Text>
              <Text
                style={[styles.balanceHint, { fontFamily: t.fontFamily.medium }]}>
                Minimum withdrawal: {formatInr(minimumAmount)}
              </Text>
            </View>

            {/* Bank details */}
            <View style={styles.card}>
              <Text
                style={[styles.cardTitle, { fontFamily: t.fontFamily.semibold }]}>
                Bank Account
              </Text>
              {bankAccount ? (
                <>
                  <View style={styles.kvRow}>
                    <Text
                      style={[styles.kvKey, { fontFamily: t.fontFamily.medium }]}>
                      Holder
                    </Text>
                    <Text
                      style={[styles.kvValue, { fontFamily: t.fontFamily.semibold }]}>
                      {bankAccount.holderName}
                    </Text>
                  </View>
                  <View style={styles.kvRow}>
                    <Text
                      style={[styles.kvKey, { fontFamily: t.fontFamily.medium }]}>
                      Account
                    </Text>
                    <Text
                      style={[styles.kvValue, { fontFamily: t.fontFamily.semibold }]}>
                      {maskAccount(bankAccount.accountNumber)}
                    </Text>
                  </View>
                  <View style={styles.kvRow}>
                    <Text
                      style={[styles.kvKey, { fontFamily: t.fontFamily.medium }]}>
                      IFSC
                    </Text>
                    <Text
                      style={[styles.kvValue, { fontFamily: t.fontFamily.semibold }]}>
                      {bankAccount.ifscCode}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => navigation.navigate('BankAccount')}
                    hitSlop={6}
                    style={styles.editLinkWrap}
                    accessibilityRole="button"
                    accessibilityLabel="Edit bank details">
                    <Text
                      style={[
                        styles.editLink,
                        { fontFamily: t.fontFamily.semibold },
                      ]}>
                      Edit bank details
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text
                    style={[styles.emptyBank, { fontFamily: t.fontFamily.medium }]}>
                    Add your bank details to place a withdrawal request.
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate('BankAccount')}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { alignSelf: 'flex-start', marginTop: 12 },
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Add bank details">
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { fontFamily: t.fontFamily.semibold },
                      ]}>
                      Add bank details
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Amount input — only when bank is present */}
            {bankAccount ? (
              <View style={styles.card}>
                <View style={styles.amountHeaderRow}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { fontFamily: t.fontFamily.semibold },
                    ]}>
                    Amount (₹)
                  </Text>
                  <Pressable
                    onPress={handleSetMax}
                    hitSlop={6}
                    disabled={walletBalance <= 0}
                    accessibilityRole="button"
                    accessibilityLabel="Use full balance">
                    <Text
                      style={[
                        styles.maxLink,
                        {
                          fontFamily: t.fontFamily.semibold,
                          opacity: walletBalance <= 0 ? 0.4 : 1,
                        },
                      ]}>
                      MAX
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.amountInput, { fontFamily: t.fontFamily.bold }]}
                  keyboardType="numeric"
                  value={amountInput}
                  onChangeText={setAmountInput}
                  placeholder="0"
                  placeholderTextColor={MUTED}
                  editable={!submitting}
                />
                {amountError ? (
                  <Text
                    style={[
                      styles.amountError,
                      { fontFamily: t.fontFamily.medium },
                    ]}>
                    {amountError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.submitBtn,
                    { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Submit withdrawal request">
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { fontFamily: t.fontFamily.semibold },
                      ]}>
                      Place request
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: BG,
  },
  topIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: { width: 44 },
  navTitle: {
    flex: 1,
    fontSize: 20,
    color: TITLE,
    marginLeft: 4,
    textAlign: 'left',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: H_PAD,
    gap: 16,
  },
  loading: { paddingTop: 60, alignItems: 'center' },
  balanceCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    marginTop: 4,
  },
  balanceHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 10,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: 16,
    color: TITLE,
    marginBottom: 8,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  kvKey: { fontSize: 14, color: MUTED },
  kvValue: { fontSize: 14, color: TITLE },
  emptyBank: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  editLinkWrap: {
    paddingTop: 8,
    paddingBottom: 2,
  },
  editLink: { color: BLUE, fontSize: 13 },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maxLink: { color: BLUE, fontSize: 12, letterSpacing: 1 },
  amountInput: {
    fontSize: 28,
    color: TITLE,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  amountError: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: BLUE,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 18,
  },
});
