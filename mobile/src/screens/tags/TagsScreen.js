import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { api } from '../../api';
import { fmtDate } from '../../utils/formatters';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyText from '../../components/common/CurrencyText';
import EmptyState from '../../components/common/EmptyState';

export default function TagsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTagsAndData = useCallback(async () => {
    try {
      const [, incData, expData] = await Promise.all([
        api.dashboard.tags().catch(() => []),
        api.incomes.list(),
        api.expenses.list(),
      ]);

      const allIncomes = incData.data || incData || [];
      const allExpenses = expData.data || expData || [];

      // Compute tag usage counts
      const tagMap = {};
      allIncomes.forEach((i) => {
        if (Array.isArray(i.tags)) {
          i.tags.forEach((t) => {
            tagMap[t] = (tagMap[t] || 0) + 1;
          });
        }
      });
      allExpenses.forEach((e) => {
        if (Array.isArray(e.tags)) {
          e.tags.forEach((t) => {
            tagMap[t] = (tagMap[t] || 0) + 1;
          });
        }
      });

      const processedTags = Object.entries(tagMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setTags(processedTags);
      setIncomes(allIncomes);
      setExpenses(allExpenses);

      if (processedTags.length > 0 && !selectedTag) {
        setSelectedTag(processedTags[0].name);
      }
    } catch (err) {
      console.warn('Failed to load tags data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    fetchTagsAndData();
  }, [fetchTagsAndData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTagsAndData();
  };

  const matchingIncomes = incomes.filter(
    (i) => Array.isArray(i.tags) && i.tags.includes(selectedTag)
  );

  const matchingExpenses = expenses.filter(
    (e) => Array.isArray(e.tags) && e.tags.includes(selectedTag)
  );

  const totalTaggedIncome = matchingIncomes.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  const totalTaggedExpenses = matchingExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  return (
    <View style={styles.container}>
      <Header
        title="Tags Browser"
        subtitle="Filter and explore transactions by tag"
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : tags.length === 0 ? (
        <EmptyState
          title="No Tags Found"
          description="Add tags when creating or editing incomes and expenses."
          icon="🏷️"
        />
      ) : (
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
          {/* Tags Chips Bar */}
          <View style={styles.tagsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagChipsRow}
            >
              {tags.map((tag) => {
                const isActive = selectedTag === tag.name;
                return (
                  <TouchableOpacity
                    key={tag.name}
                    style={[
                      styles.tagPill,
                      isActive && styles.tagPillActive,
                    ]}
                    onPress={() => setSelectedTag(tag.name)}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        isActive && styles.tagPillTextActive,
                      ]}
                    >
                      #{tag.name}
                    </Text>
                    <View
                      style={[
                        styles.countBadge,
                        isActive && styles.countBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          isActive && styles.countTextActive,
                        ]}
                      >
                        {tag.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Tag Summary Card */}
          {selectedTag && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Text style={styles.selectedTagHeading}>#{selectedTag}</Text>
                <Text style={styles.selectedTagCount}>
                  {matchingIncomes.length + matchingExpenses.length} transactions
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxLabel}>Total Incomes</Text>
                  <CurrencyText
                    amount={totalTaggedIncome}
                    color={COLORS.success}
                    size={16}
                    bold
                  />
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxLabel}>Total Expenses</Text>
                  <CurrencyText
                    amount={totalTaggedExpenses}
                    color={COLORS.danger}
                    size={16}
                    bold
                  />
                </View>
              </View>
            </View>
          )}

          {/* Matching Incomes */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>
              Incomes ({matchingIncomes.length})
            </Text>
            {matchingIncomes.length === 0 ? (
              <Text style={styles.emptySectionText}>No incomes with this tag.</Text>
            ) : (
              matchingIncomes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() =>
                    navigation.navigate('IncomesStack', {
                      screen: 'IncomeDetail',
                      params: { incomeId: item.id },
                    })
                  }
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemTitle}>{item.source}</Text>
                    <Text style={styles.itemDate}>{fmtDate(item.date)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <CurrencyText
                      amount={item.amount}
                      color={COLORS.success}
                      size={14}
                      bold
                    />
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Matching Expenses */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>
              Expenses ({matchingExpenses.length})
            </Text>
            {matchingExpenses.length === 0 ? (
              <Text style={styles.emptySectionText}>No expenses with this tag.</Text>
            ) : (
              matchingExpenses.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() =>
                    navigation.navigate('ExpensesStack', {
                      screen: 'ExpenseDetail',
                      params: { expenseId: item.id },
                    })
                  }
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDate}>
                      {item.category} • {fmtDate(item.date)}
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    <CurrencyText
                      amount={item.amount}
                      color={COLORS.danger}
                      size={14}
                      bold
                    />
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.lg,
  },
  tagsContainer: {
    marginVertical: SPACING.xs,
  },
  tagChipsRow: {
    gap: SPACING.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  tagPillActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  tagPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  tagPillTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  countBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  countText: {
    color: COLORS.textSubtle,
    fontSize: 11,
    fontWeight: '600',
  },
  countTextActive: {
    color: '#0d0f14',
  },
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  selectedTagHeading: {
    color: COLORS.primaryLight,
    fontSize: 20,
    fontWeight: '700',
  },
  selectedTagCount: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryBoxLabel: {
    color: COLORS.textSubtle,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionWrap: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySectionText: {
    color: COLORS.textSubtle,
    fontSize: 13,
    fontStyle: 'italic',
  },
  itemCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDate: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
