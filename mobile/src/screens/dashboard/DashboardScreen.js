import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { fmt, fmtDate, paymentMethodLabel, timeAgo } from '../../utils/formatters';
import MetricCard from '../../components/common/MetricCard';
import StatusBadge from '../../components/common/StatusBadge';
import Header from '../../components/common/Header';
import AddEditIncomeModal from '../../components/modals/AddEditIncomeModal';
import AddEditExpenseModal from '../../components/modals/AddEditExpenseModal';
import AllocationModal from '../../components/modals/AllocationModal';
import EmptyState from '../../components/common/EmptyState';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [sumData, tagsData] = await Promise.all([
        api.dashboard.summary(),
        api.dashboard.tags().catch(() => []),
      ]);
      setSummary(sumData);
      setAllTags(tagsData || []);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'User';

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const {
    total_income = 0,
    total_expenses = 0,
    available_funds = 0,
    pending_reimbursements = 0,
    total_allocated = 0,
    unsettled_expenses = [],
    recent_activity = [],
  } = summary || {};

  return (
    <View style={styles.container}>
      <Header
        title={`${greeting()}, ${userName}`}
        subtitle="Financial Overview & Live Balances"
        user={user}
        onAvatarPress={() => navigation.navigate('ProfileScreen')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Quick Action Buttons */}
        <View style={styles.actionPillsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.actionPill, styles.incomePill]}
            onPress={() => setShowIncomeModal(true)}
          >
            <Text style={styles.pillIcon}>＋</Text>
            <Text style={styles.incomePillText}>Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.actionPill, styles.expensePill]}
            onPress={() => setShowExpenseModal(true)}
          >
            <Text style={styles.pillIcon}>＋</Text>
            <Text style={styles.expensePillText}>Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.actionPill, styles.allocatePill]}
            onPress={() => setShowAllocationModal(true)}
          >
            <Text style={styles.pillIcon}>⇄</Text>
            <Text style={styles.allocatePillText}>Allocate</Text>
          </TouchableOpacity>
        </View>

        {/* 5 Metric Cards */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Summary Metrics</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsCarousel}
        >
          <MetricCard
            title="Total Income"
            amount={total_income}
            subtitle="All logged funds"
            accentColor={COLORS.success}
            icon="↑"
            style={styles.metricCardItem}
            onPress={() => navigation.navigate('IncomesStack')}
          />
          <MetricCard
            title="Total Expenses"
            amount={total_expenses}
            subtitle="All logged spending"
            accentColor={COLORS.danger}
            icon="↓"
            style={styles.metricCardItem}
            onPress={() => navigation.navigate('ExpensesStack')}
          />
          <MetricCard
            title="Available Funds"
            amount={available_funds}
            subtitle="Unallocated income"
            accentColor={COLORS.primary}
            icon="₹"
            style={styles.metricCardItem}
          />
          <MetricCard
            title="Pending Amount"
            amount={pending_reimbursements}
            subtitle="Uncovered spending"
            accentColor={COLORS.warning}
            icon="⏳"
            style={styles.metricCardItem}
          />
          <MetricCard
            title="Total Allocated"
            amount={total_allocated}
            subtitle="Linked & settled"
            accentColor={COLORS.accent}
            icon="⇄"
            style={styles.metricCardItem}
            onPress={() => navigation.navigate('Allocations')}
          />
        </ScrollView>

        {/* Unsettled Expenses Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Unsettled Expenses</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ExpensesStack', {
                  screen: 'ExpensesList',
                  params: { filterStatus: 'PENDING' },
                })
              }
            >
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {unsettled_expenses.length === 0 ? (
            <View style={styles.cleanStatusBox}>
              <Text style={styles.cleanStatusIcon}>✓</Text>
              <Text style={styles.cleanStatusTitle}>All Expenses Settled!</Text>
              <Text style={styles.cleanStatusSub}>
                There are no pending expenses requiring allocation.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {unsettled_expenses.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  style={styles.unsettledCard}
                  onPress={() =>
                    navigation.navigate('ExpensesStack', {
                      screen: 'ExpenseDetail',
                      params: { expenseId: item.id },
                    })
                  }
                >
                  <View style={styles.unsettledLeft}>
                    <Text style={styles.unsettledTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.unsettledMeta}>
                      <Text style={styles.unsettledCat}>{item.category}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Text style={styles.unsettledDate}>{fmtDate(item.date)}</Text>
                    </View>
                  </View>

                  <View style={styles.unsettledRight}>
                    <Text style={styles.pendingAmtLabel}>Pending</Text>
                    <Text style={styles.pendingAmtValue}>
                      {fmt(item.pending_amount)}
                    </Text>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity Feed */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Recent Activity</Text>
          </View>

          {recent_activity.length === 0 ? (
            <EmptyState
              title="No Recent Activity"
              description="Log incomes and expenses to see live transaction updates."
              icon="🕒"
            />
          ) : (
            <View style={styles.activityFeed}>
              {recent_activity.slice(0, 15).map((act, index) => {
                const activityType = String(act.type || '').toLowerCase();
                const isIncome = activityType === 'income';
                const isExpense = activityType === 'expense';
                const isAlloc = activityType === 'allocation';

                let badgeColor = COLORS.primary;
                let typeLabel = 'Action';
                if (isIncome) {
                  badgeColor = COLORS.success;
                  typeLabel = 'Income Logged';
                } else if (isExpense) {
                  badgeColor = COLORS.danger;
                  typeLabel = 'Expense Recorded';
                } else if (isAlloc) {
                  badgeColor = COLORS.accent;
                  typeLabel = 'Funds Linked';
                }

                return (
                  <View key={act.id || index} style={styles.activityItem}>
                    <View
                      style={[
                        styles.activityBullet,
                        { backgroundColor: badgeColor },
                      ]}
                    />
                    <View style={styles.activityContent}>
                      <View style={styles.activityTop}>
                        <Text style={styles.activityTitle} numberOfLines={1}>
                          {act.description || act.title || typeLabel}
                        </Text>
                        <Text
                          style={[
                            styles.activityAmount,
                            isIncome && { color: COLORS.success },
                            isExpense && { color: COLORS.danger },
                            isAlloc && { color: COLORS.accent },
                          ]}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {fmt(act.amount)}
                        </Text>
                      </View>
                      <View style={styles.activityBottom}>
                        <Text style={styles.activityTypeTag}>
                          {act.payment_method
                            ? `${typeLabel} · ${paymentMethodLabel(act.payment_method)}`
                            : typeLabel}
                        </Text>
                        <Text style={styles.activityTime}>
                          {timeAgo(act.created_at || act.date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reusable Action Modals */}
      <AddEditIncomeModal
        visible={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={fetchDashboardData}
        allTags={allTags}
      />
      <AddEditExpenseModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={fetchDashboardData}
        allTags={allTags}
      />
      <AllocationModal
        visible={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        onSuccess={fetchDashboardData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  actionPillsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  pillIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  incomePill: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successDim,
  },
  incomePillText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '700',
  },
  expensePill: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerDim,
  },
  expensePillText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  allocatePill: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accentDim,
  },
  allocatePillText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  metricsCarousel: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  metricCardItem: {
    width: 170,
  },
  sectionWrap: {
    marginTop: SPACING.lg,
  },
  cardList: {
    gap: SPACING.sm,
  },
  unsettledCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unsettledLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  unsettledTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  unsettledMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unsettledCat: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  dotSeparator: {
    color: COLORS.textSubtle,
    marginHorizontal: 4,
  },
  unsettledDate: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  unsettledRight: {
    alignItems: 'flex-end',
  },
  pendingAmtLabel: {
    color: COLORS.textSubtle,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  pendingAmtValue: {
    color: COLORS.warning,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  cleanStatusBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  cleanStatusIcon: {
    fontSize: 24,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  cleanStatusTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cleanStatusSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  activityFeed: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityBullet: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    marginTop: 6,
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  activityBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  activityTypeTag: {
    color: COLORS.textSubtle,
    fontSize: 11,
  },
  activityTime: {
    color: COLORS.textSubtle,
    fontSize: 11,
  },
});
