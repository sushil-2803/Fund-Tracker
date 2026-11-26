import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BarChart,
  LineChart,
  PieChart,
} from 'react-native-chart-kit';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { api } from '../../api';
import { fmt, fmtDate } from '../../utils/formatters';
import Header from '../../components/common/Header';
import CurrencyText from '../../components/common/CurrencyText';
import EmptyState from '../../components/common/EmptyState';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - SPACING.lg * 2 - SPACING.md * 2;

const chartConfig = {
  backgroundColor: COLORS.bgCard,
  backgroundGradientFrom: COLORS.bgCard,
  backgroundGradientTo: COLORS.bgCard,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(108, 143, 247, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(155, 163, 188, ${opacity})`,
  style: {
    borderRadius: RADIUS.md,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: COLORS.primary,
  },
  propsForBackgroundLines: {
    stroke: COLORS.border,
    strokeDasharray: '4',
  },
};

const PALETTE = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.accent,
  '#38bdf8',
  '#fb923c',
  '#ec4899',
];

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [sumData, incData, expData] = await Promise.all([
        api.dashboard.summary(),
        api.incomes.list(),
        api.expenses.list(),
      ]);
      setSummary(sumData);
      setIncomes(incData.data || incData || []);
      setExpenses(expData.data || expData || []);
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Computing Analytics...</Text>
      </View>
    );
  }

  const hasData = incomes.length > 0 || expenses.length > 0;

  // 1. Metric Pills Computation
  const totalIncome = Number(summary?.total_income || 0);
  const totalExpenses = Number(summary?.total_expenses || 0);
  const totalAllocated = Number(summary?.total_allocated || 0);
  const pendingReimbursements = Number(summary?.pending_reimbursements || 0);
  const netBalance = totalIncome - totalExpenses;
  const allocationRate = totalIncome > 0 ? Math.round((totalAllocated / totalIncome) * 100) : 0;
  const settlementRate = totalExpenses > 0
    ? Math.round(((totalExpenses - pendingReimbursements) / totalExpenses) * 100)
    : 0;
  const avgExpense = expenses.length > 0
    ? Math.round(expenses.reduce((s, e) => s + Number(e.amount), 0) / expenses.length)
    : 0;

  // 2. Monthly Income vs Expense Data
  const monthlyMap = {};
  [...incomes, ...expenses].forEach((item) => {
    if (!item.date) return;
    const d = new Date(item.date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expense: 0 };
    if (item.source !== undefined) {
      monthlyMap[key].income += Number(item.amount || 0);
    } else {
      monthlyMap[key].expense += Number(item.amount || 0);
    }
  });

  const sortedMonths = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const monthlyLabels = sortedMonths.map((m) => {
    try {
      const dt = new Date(m.month + '-01');
      return dt.toLocaleDateString('en-IN', { month: 'short' });
    } catch {
      return m.month;
    }
  });

  const monthlyIncomeDataset = sortedMonths.map((m) => m.income);

  // 3. Category Breakdown Data
  const catMap = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
  });
  const categoryPieData = Object.entries(catMap)
    .map(([name, value], idx) => ({
      name: name.length > 12 ? name.slice(0, 10) + '..' : name,
      population: Math.round(value),
      color: PALETTE[idx % PALETTE.length],
      legendFontColor: COLORS.textMuted,
      legendFontSize: 11,
    }))
    .sort((a, b) => b.population - a.population)
    .slice(0, 6);

  // 4. Income Source Breakdown
  const srcMap = {};
  incomes.forEach((i) => {
    const src = i.source || 'Other';
    srcMap[src] = (srcMap[src] || 0) + Number(i.amount || 0);
  });
  const sourcePieData = Object.entries(srcMap)
    .map(([name, value], idx) => ({
      name: name.length > 12 ? name.slice(0, 10) + '..' : name,
      population: Math.round(value),
      color: PALETTE[idx % PALETTE.length],
      legendFontColor: COLORS.textMuted,
      legendFontSize: 11,
    }))
    .sort((a, b) => b.population - a.population)
    .slice(0, 6);

  // 5. Settlement Status Pie
  const settledSum = expenses
    .filter((e) => e.status === 'SETTLED')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const partialSum = expenses
    .filter((e) => e.status === 'PARTIALLY_SETTLED')
    .reduce((s, e) => s + Number(e.settled_amount || 0), 0);
  const pendingSum = expenses
    .filter((e) => e.status === 'PENDING')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const statusPieData = [
    {
      name: 'Settled',
      population: Math.round(settledSum),
      color: COLORS.success,
      legendFontColor: COLORS.textMuted,
      legendFontSize: 11,
    },
    {
      name: 'Partial',
      population: Math.round(partialSum),
      color: COLORS.warning,
      legendFontColor: COLORS.textMuted,
      legendFontSize: 11,
    },
    {
      name: 'Pending',
      population: Math.round(pendingSum),
      color: COLORS.danger,
      legendFontColor: COLORS.textMuted,
      legendFontSize: 11,
    },
  ].filter((d) => d.population > 0);

  // 6. Cumulative Growth Timeline
  const allDated = [
    ...incomes.map((i) => ({ date: i.date, type: 'income', amount: Number(i.amount || 0) })),
    ...expenses.map((e) => ({ date: e.date, type: 'expense', amount: Number(e.amount || 0) })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let cumIncome = 0;
  let cumExpense = 0;
  const cumulativePoints = allDated.map((d) => {
    if (d.type === 'income') cumIncome += d.amount;
    else cumExpense += d.amount;
    return {
      date: fmtDate(d.date),
      income: cumIncome,
      expense: cumExpense,
    };
  }).slice(-8);

  // 7. Top Expenses List
  const topExpenses = [...expenses]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 6);

  return (
    <View style={styles.container}>
      <Header
        title="Analytics & Insights"
        subtitle={`${incomes.length} Incomes • ${expenses.length} Expenses`}
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
        {!hasData ? (
          <EmptyState
            title="No Data for Analytics"
            description="Add incomes and expenses to see charts, trends, and financial breakdown."
            icon="📊"
          />
        ) : (
          <View style={styles.bodyWrap}>
            {/* 4 Summary Metric Pills */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricPillCard}>
                <Text style={styles.pillLabel}>Net Balance</Text>
                <CurrencyText
                  amount={netBalance}
                  color={netBalance >= 0 ? COLORS.success : COLORS.danger}
                  size={17}
                  bold
                />
              </View>

              <View style={styles.metricPillCard}>
                <Text style={styles.pillLabel}>Allocation Rate</Text>
                <Text style={[styles.pillValueText, { color: COLORS.accent }]}>
                  {allocationRate}%
                </Text>
              </View>

              <View style={styles.metricPillCard}>
                <Text style={styles.pillLabel}>Settlement Rate</Text>
                <Text style={[styles.pillValueText, { color: COLORS.success }]}>
                  {settlementRate}%
                </Text>
              </View>

              <View style={styles.metricPillCard}>
                <Text style={styles.pillLabel}>Avg Expense</Text>
                <CurrencyText
                  amount={avgExpense}
                  color={COLORS.warning}
                  size={17}
                  bold
                />
              </View>
            </View>

            {/* 1. Monthly Bar Chart (Income vs Expenses) */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Incomes vs Expenses</Text>
              <Text style={styles.chartSubtitle}>Comparison of monthly fund flows</Text>

              {sortedMonths.length === 0 ? (
                <Text style={styles.noDataText}>Not enough monthly data</Text>
              ) : (
                <View style={styles.chartInner}>
                  <BarChart
                    data={{
                      labels: monthlyLabels,
                      datasets: [
                        {
                          data: monthlyIncomeDataset.length > 0 ? monthlyIncomeDataset : [0],
                          color: () => COLORS.success,
                        },
                      ],
                    }}
                    width={chartWidth}
                    height={210}
                    yAxisLabel="₹"
                    yAxisSuffix=""
                    fromZero
                    chartConfig={{
                      ...chartConfig,
                      color: () => COLORS.success,
                    }}
                    style={styles.chartStyle}
                    showValuesOnTopOfBars
                  />
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.legendLabel}>Monthly Incomes</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 2. Cumulative Growth Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Cumulative Inflow vs Outflow</Text>
              <Text style={styles.chartSubtitle}>Running totals of funds across time</Text>

              {cumulativePoints.length < 2 ? (
                <Text style={styles.noDataText}>Need at least 2 entries for trendline</Text>
              ) : (
                <View style={styles.chartInner}>
                  <LineChart
                    data={{
                      labels: cumulativePoints.map((p) => p.date.slice(0, 5)),
                      datasets: [
                        {
                          data: cumulativePoints.map((p) => p.income),
                          color: () => COLORS.success,
                          strokeWidth: 2,
                        },
                        {
                          data: cumulativePoints.map((p) => p.expense),
                          color: () => COLORS.danger,
                          strokeWidth: 2,
                        },
                      ],
                      legend: ['Incomes', 'Expenses'],
                    }}
                    width={chartWidth}
                    height={210}
                    yAxisLabel="₹"
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chartStyle}
                  />
                </View>
              )}
            </View>

            {/* 3. Expense Categories Donut / Pie */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Expenses by Category</Text>
              <Text style={styles.chartSubtitle}>Distribution of spending across categories</Text>

              {categoryPieData.length === 0 ? (
                <Text style={styles.noDataText}>No expenses recorded yet</Text>
              ) : (
                <PieChart
                  data={categoryPieData}
                  width={chartWidth}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              )}
            </View>

            {/* 4. Income Sources Pie */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Incomes by Source</Text>
              <Text style={styles.chartSubtitle}>Breakdown of funding sources</Text>

              {sourcePieData.length === 0 ? (
                <Text style={styles.noDataText}>No incomes recorded yet</Text>
              ) : (
                <PieChart
                  data={sourcePieData}
                  width={chartWidth}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              )}
            </View>

            {/* 5. Settlement Status Breakdown */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Settlement Status Breakdown</Text>
              <Text style={styles.chartSubtitle}>Status of all logged expenses</Text>

              {statusPieData.length === 0 ? (
                <Text style={styles.noDataText}>No expense settlement data</Text>
              ) : (
                <>
                  <PieChart
                    data={statusPieData}
                    width={chartWidth}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                  <View style={styles.settlementSummaryList}>
                    {statusPieData.map((item) => (
                      <View key={item.name} style={styles.settlementSummaryRow}>
                        <View style={styles.settlementSummaryLeft}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text style={styles.settlementName}>{item.name}</Text>
                        </View>
                        <CurrencyText
                          amount={item.population}
                          color={item.color}
                          size={13}
                          bold
                        />
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* 6. Top Expenses Bar Breakdown */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top Expenses (Cost vs Settled)</Text>
              <Text style={styles.chartSubtitle}>Largest expenses and their coverage</Text>

              {topExpenses.length === 0 ? (
                <Text style={styles.noDataText}>No expenses logged yet</Text>
              ) : (
                <View style={styles.topExpensesList}>
                  {topExpenses.map((exp) => {
                    const cost = Number(exp.amount || 0);
                    const settled = Number(exp.settled_amount || 0);
                    const fillPct = cost > 0 ? (settled / cost) * 100 : 0;

                    return (
                      <View key={exp.id} style={styles.topExpenseItem}>
                        <View style={styles.topExpHeader}>
                          <Text style={styles.topExpTitle} numberOfLines={1}>
                            {exp.title}
                          </Text>
                          <Text style={styles.topExpAmounts}>
                            {fmt(settled)} / {fmt(cost)}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.min(fillPct, 100)}%`,
                                backgroundColor:
                                  fillPct >= 100
                                    ? COLORS.success
                                    : fillPct >= 50
                                    ? COLORS.warning
                                    : COLORS.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
  bodyWrap: {
    gap: SPACING.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricPillCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  pillLabel: {
    color: COLORS.textSubtle,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pillValueText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  chartCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  chartTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  chartSubtitle: {
    color: COLORS.textSubtle,
    fontSize: 12,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  chartInner: {
    alignItems: 'center',
  },
  chartStyle: {
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  noDataText: {
    color: COLORS.textMuted,
    fontSize: 13,
    paddingVertical: SPACING.lg,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
  },
  legendLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  settlementSummaryList: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  settlementSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  settlementSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementName: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  topExpensesList: {
    gap: SPACING.md,
  },
  topExpenseItem: {
    gap: 4,
  },
  topExpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topExpTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: SPACING.sm,
  },
  topExpAmounts: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
