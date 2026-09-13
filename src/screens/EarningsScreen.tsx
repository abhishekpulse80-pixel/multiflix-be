import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import { useGetBankAccountQuery } from '../store/api/authApi';
import {
  useGetScreenTimeQuery,
  useGetWalletQuery,
} from '../store/api/earningsApi';
import {
  useGetMyWithdrawalRequestsQuery,
  useGetWithdrawalSettingsQuery,
} from '../store/api/withdrawalApi';
import type { WithdrawalRequestStatus } from '../types/withdrawalApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { useTheme } from '../theme';

const BG = '#F6F7FB';
const CARD_BG = '#FFFFFF';
const BLUE = '#246BFD';
const TITLE = '#0D0D0D';
const MUTED = '#8E8E93';
const BORDER = '#EEF0F3';
const H_PAD = 20;
/** How many days of screen time to chart. */
const SCREEN_TIME_DAYS = 7;
/** Chart visual tuning. */
const BAR_AREA_HEIGHT = 140;
const BAR_WIDTH = 22;
const BAR_RADIUS = 6;
const MIN_BAR_HEIGHT = 3;

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;

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

/** `123456.5` → `₹1,23,456.50` (Indian digit grouping). */
function formatCurrency(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(safe).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = safe < 0 ? '-' : '';
  return `${sign}₹${abs}`;
}

/** Whole minutes → `Xh Ym` (or `Xm` / `0m`). */
function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** ISO `2026-04-22T…` → `Apr 22, 2026`. */
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function statusPillStyle(status: WithdrawalRequestStatus): {
  bg: string;
  fg: string;
  label: string;
} {
  switch (status) {
    case 'approved':
      return { bg: '#E6F4EA', fg: '#1E8E3E', label: 'Approved' };
    case 'rejected':
      return { bg: '#FDECEA', fg: '#C5221F', label: 'Rejected' };
    case 'pending':
    default:
      return { bg: '#FEF3C7', fg: '#B45309', label: 'Pending' };
  }
}

export function EarningsScreen({ navigation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const {
    data: walletData,
    isLoading: walletLoading,
    isFetching: walletFetching,
    refetch: refetchWallet,
  } = useGetWalletQuery();

  const {
    data: screenTimeData,
    isLoading: screenTimeLoading,
    refetch: refetchScreenTime,
  } = useGetScreenTimeQuery({ days: SCREEN_TIME_DAYS });

  const { data: settingsData, refetch: refetchSettings } =
    useGetWithdrawalSettingsQuery();
  const { data: bankData, refetch: refetchBank } = useGetBankAccountQuery();
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useGetMyWithdrawalRequestsQuery({ page: 0, limit: 20 });

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([
      refetchWallet(),
      refetchScreenTime(),
      refetchSettings(),
      refetchBank(),
      refetchHistory(),
    ]),
  );

  React.useEffect(() => {
    if (Platform.OS === 'android') {
    }
  }, []);

  const hasBank = bankData?.bankAccount != null;

  const onWithdraw = React.useCallback(() => {
    if (!hasBank) {
      navigation.navigate('BankAccount');
      return;
    }
    navigation.navigate('WithdrawRequest');
  }, [hasBank, navigation]);

  const minimumAmount = settingsData?.minimumAmount ?? null;
  const minimumAmountLabel =
    minimumAmount !== null
      ? `₹${minimumAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      : null;

  const balanceLabel = walletLoading
    ? '—'
    : formatCurrency(walletData?.walletBalance ?? 0);

  const screenTimeDays = screenTimeData?.days ?? [];
  const maxMinutes = screenTimeDays.reduce(
    (m, d) => (d.minutes > m ? d.minutes : m),
    0,
  );
  const dailyAverageMinutes = screenTimeData?.dailyAverageMinutes ?? 0;

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
          Earnings Overview
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={REFRESH_TINT}
            colors={[REFRESH_TINT]}
          />
        }>
        {/* Current balance card */}
        <View style={styles.balanceCard}>
          <Text
            style={[styles.balanceLabel, { fontFamily: t.fontFamily.medium }]}>
            Current Balance
          </Text>
          <View style={styles.balanceAmountRow}>
            <Text
              style={[styles.balanceAmount, { fontFamily: t.fontFamily.bold }]}>
              {balanceLabel}
            </Text>
            {walletFetching && !walletLoading ? (
              <ActivityIndicator
                color="#FFFFFF"
                style={styles.balanceSpinner}
                size="small"
              />
            ) : null}
          </View>

          {minimumAmountLabel ? (
            <View style={styles.minInfoRow}>
              <View style={styles.infoIcon}>
                <Text
                  style={[styles.infoIconText, { fontFamily: t.fontFamily.bold }]}>
                  i
                </Text>
              </View>
              <Text
                style={[styles.minInfoText, { fontFamily: t.fontFamily.medium }]}>
                Minimum withdraw: {minimumAmountLabel}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={onWithdraw}
            style={({ pressed }) => [
              styles.withdrawBtn,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Withdraw">
            <Text
              style={[styles.withdrawBtnText, { fontFamily: t.fontFamily.semibold }]}>
              Withdraw
            </Text>
          </Pressable>
        </View>

        {/* Screen time card */}
        <View style={styles.card}>
          <Text
            style={[styles.cardTitle, { fontFamily: t.fontFamily.semibold }]}>
            Screen Time
          </Text>
          <Text
            style={[styles.screenTimeSubLabel, { fontFamily: t.fontFamily.medium }]}>
            Daily Average (last {SCREEN_TIME_DAYS} days)
          </Text>
          <Text
            style={[styles.screenTimeValue, { fontFamily: t.fontFamily.bold }]}>
            {screenTimeLoading ? '—' : formatMinutes(dailyAverageMinutes)}
          </Text>

          {screenTimeLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={MUTED} />
            </View>
          ) : (
            <View style={styles.chartWrap}>
              {screenTimeDays.map((d) => {
                const ratio = maxMinutes > 0 ? d.minutes / maxMinutes : 0;
                const barH =
                  d.minutes > 0
                    ? Math.max(
                        MIN_BAR_HEIGHT,
                        Math.round(ratio * BAR_AREA_HEIGHT),
                      )
                    : MIN_BAR_HEIGHT;
                return (
                  <View key={d.date} style={styles.chartCol}>
                    <View style={styles.chartBarArea}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: barH,
                            backgroundColor: d.minutes > 0 ? BLUE : BORDER,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.chartLabel,
                        { fontFamily: t.fontFamily.medium },
                      ]}>
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Withdrawal history card */}
        <View style={styles.card}>
          <Text
            style={[styles.cardTitle, { fontFamily: t.fontFamily.semibold }]}>
            Withdrawal History
          </Text>

          {historyLoading && !historyData ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator color={MUTED} />
            </View>
          ) : (historyData?.items ?? []).length === 0 ? (
            <Text
              style={[styles.historyEmpty, { fontFamily: t.fontFamily.medium }]}>
              No withdrawal requests yet.
            </Text>
          ) : (
            (historyData?.items ?? []).map((item, i, arr) => {
              const pill = statusPillStyle(item.status);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyRow,
                    i === arr.length - 1 && styles.historyRowLast,
                  ]}>
                  <View style={styles.historyTextBlock}>
                    <Text
                      style={[
                        styles.historyAmount,
                        { fontFamily: t.fontFamily.semibold },
                      ]}>
                      {formatCurrency(item.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.historyDate,
                        { fontFamily: t.fontFamily.regular },
                      ]}>
                      {formatShortDate(item.createdAt)}
                    </Text>
                    {item.status === 'rejected' && item.adminNote ? (
                      <Text
                        style={[
                          styles.historyReason,
                          { fontFamily: t.fontFamily.medium },
                        ]}
                        numberOfLines={3}>
                        Reason: {item.adminNote}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: pill.fg, fontFamily: t.fontFamily.semibold },
                      ]}>
                      {pill.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
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
  topBarSpacer: {
    width: 44,
  },
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
  /** Blue balance card */
  balanceCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    marginTop: 4,
  },
  balanceSpinner: {
    marginLeft: 10,
    marginTop: 4,
  },
  minInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    gap: 8,
  },
  infoIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
  },
  minInfoText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
  },
  withdrawBtn: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  withdrawBtnText: {
    color: BLUE,
    fontSize: 15,
  },
  /** Generic white card */
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
  },
  /** Screen-time card */
  screenTimeSubLabel: {
    fontSize: 13,
    color: MUTED,
    marginTop: 12,
  },
  screenTimeValue: {
    fontSize: 28,
    color: TITLE,
    marginTop: 4,
  },
  chartLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarArea: {
    height: BAR_AREA_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: BAR_WIDTH,
    borderRadius: BAR_RADIUS,
  },
  chartLabel: {
    marginTop: 8,
    fontSize: 12,
    color: MUTED,
  },
  /** Withdrawal history */
  historyLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  historyEmpty: {
    paddingVertical: 20,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  historyAmount: {
    fontSize: 15,
    color: TITLE,
  },
  historyDate: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },
  historyReason: {
    fontSize: 12,
    color: '#C5221F',
    marginTop: 6,
    lineHeight: 16,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
  },
});
