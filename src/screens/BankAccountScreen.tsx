import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';
import { useGetBankAccountQuery, useSaveBankAccountMutation } from '../store';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError, toastInfo } from '../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'BankAccount'>;

const BG = '#FFFFFF';
const TITLE = '#212121';
const MUTED = '#8A8A8A';
const BLUE = '#246BFD';
const H_PAD = 24;

type FocusKey =
  | 'holderName'
  | 'accountNumber'
  | 'ifscCode'
  | 'bankName'
  | 'upiId'
  | null;

function BackArrowIcon({ size = 24, color = TITLE }: { size?: number; color?: string }) {
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

function UserIcon({ size = 20, color = MUTED }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HashIcon({ size = 20, color = MUTED }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BankIcon({ size = 20, color = MUTED }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BankAccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useGetBankAccountQuery();
  const [save, { isLoading: saving }] = useSaveBankAccountMutation();

  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [focusedField, setFocusedField] = useState<FocusKey>(null);

  useEffect(() => {
    if (data?.bankAccount) {
      setHolderName(data.bankAccount.holderName);
      setAccountNumber(data.bankAccount.accountNumber);
      setIfscCode(data.bankAccount.ifscCode);
      setBankName(data.bankAccount.bankName ?? '');
      setUpiId(data.bankAccount.upiId ?? '');
    }
  }, [data]);

  // UPI is optional, but when present it must look like a VPA (`name@handle`).
  const upiTrim = upiId.trim();
  const upiValid = upiTrim.length === 0 || /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upiTrim);

  const canSave =
    holderName.trim().length > 0 &&
    accountNumber.trim().length >= 5 &&
    ifscCode.trim().length >= 4 &&
    bankName.trim().length > 0 &&
    upiValid;

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    try {
      await save({
        holderName: holderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankName: bankName.trim(),
        upiId: upiTrim.length > 0 ? upiTrim : null,
      }).unwrap();
      toastInfo('Bank Account', 'Saved successfully.');
      navigation.goBack();
    } catch (err) {
      toastError('Error', getApiErrorMessage(err));
    }
  }, [
    canSave,
    saving,
    save,
    holderName,
    accountNumber,
    ifscCode,
    bankName,
    upiTrim,
    navigation,
  ]);

  return (
    <View style={styles.root}>
{/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}>
          <BackArrowIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Bank Account</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(24, insets.bottom + 12) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>Account Holder Name</Text>
          <FormTextField
            leftIcon={<UserIcon />}
            placeholder="Full name as on bank account"
            value={holderName}
            onChangeText={setHolderName}
            focused={focusedField === 'holderName'}
            onFocus={() => setFocusedField('holderName')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Account Number</Text>
          <FormTextField
            leftIcon={<HashIcon />}
            placeholder="Account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            focused={focusedField === 'accountNumber'}
            onFocus={() => setFocusedField('accountNumber')}
            onBlur={() => setFocusedField(null)}
            keyboardType="number-pad"
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>IFSC Code</Text>
          <FormTextField
            leftIcon={<BankIcon />}
            placeholder="e.g. SBIN0001234"
            value={ifscCode}
            onChangeText={setIfscCode}
            focused={focusedField === 'ifscCode'}
            onFocus={() => setFocusedField('ifscCode')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="characters"
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Bank Name</Text>
          <FormTextField
            leftIcon={<BankIcon />}
            placeholder="e.g. HDFC Bank"
            value={bankName}
            onChangeText={setBankName}
            focused={focusedField === 'bankName'}
            onFocus={() => setFocusedField('bankName')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            UPI ID <Text style={styles.optional}>(optional)</Text>
          </Text>
          <FormTextField
            leftIcon={<HashIcon />}
            placeholder="e.g. yourname@okicici"
            value={upiId}
            onChangeText={setUpiId}
            focused={focusedField === 'upiId'}
            onFocus={() => setFocusedField('upiId')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          {!upiValid ? (
            <Text style={styles.fieldError}>
              Enter a valid UPI id like name@bank.
            </Text>
          ) : null}

          <View style={{ marginTop: 32 }}>
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              onPress={handleSave}
              disabled={!canSave || saving}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    height: 52,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TITLE,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TITLE,
    marginBottom: 8,
  },
  optional: {
    fontWeight: '400',
    color: MUTED,
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#E0325C',
  },
});
