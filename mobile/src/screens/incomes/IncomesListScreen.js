import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { api } from '../../api';
import { fmtDate, paymentMethodLabel } from '../../utils/formatters';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import CurrencyText from '../../components/common/CurrencyText';
import EmptyState from '../../components/common/EmptyState';
import ConfirmModal from '../../components/common/ConfirmModal';
import AddEditIncomeModal from '../../components/modals/AddEditIncomeModal';
import { useToast } from '../../context/ToastContext';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Unused', value: 'UNUSED' },
  { label: 'Partial', value: 'PARTIALLY_USED' },
  { label: 'Fully Used', value: 'FULLY_USED' },
];

export default function IncomesListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [incomes, setIncomes] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deletingIncome, setDeletingIncome] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchIncomes = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;

      const [incomesData, tagsData] = await Promise.all([
        api.incomes.list(params),
        api.dashboard.tags().catch(() => []),
      ]);

      setIncomes(incomesData.data || incomesData || []);
      setAllTags(tagsData || []);
    } catch (err) {
      console.warn('Failed to fetch incomes:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncomes();
  };

  const handleEdit = (income) => {
    setEditingIncome(income);
    setShowAddEditModal(true);
  };

  const handleDelete = async () => {
    if (!deletingIncome) return;
    setIsDeleting(true);
    try {
      await api.incomes.delete(deletingIncome.id);
      showToast('Income deleted successfully', 'success');
      setDeletingIncome(null);
      fetchIncomes();
    } catch (err) {
      showToast(err.message || 'Failed to delete income', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderIncomeItem = ({ item }) => {
    const allocated = Number(item.allocated_amount || 0);
    const total = Number(item.amount || 0);
    const remaining = Number(item.remaining_amount || (total - allocated));

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.card}
        onPress={() =>
          navigation.navigate('IncomeDetail', { incomeId: item.id })
        }
      >
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.sourceWrap}>
            <Text style={styles.sourceTitle} numberOfLines={1}>
              {item.source}
            </Text>
            <Text style={styles.dateText}>
              {fmtDate(item.date)} • {paymentMethodLabel(item.payment_method)}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        {/* Amounts Row */}
        <View style={styles.amountsRow}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Total</Text>
            <CurrencyText amount={total} size={15} color={COLORS.textPrimary} bold />
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Allocated</Text>
            <CurrencyText amount={allocated} size={14} color={COLORS.accent} />
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Remaining</Text>
            <CurrencyText amount={remaining} size={14} color={COLORS.success} bold />
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressWrap}>
          <ProgressBar
            used={allocated}
            total={total}
            showLabel
            labelPrefix="Usage"
            height={5}
          />
        </View>

        {/* Tags Row */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionLink}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.editActionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionLink}
            onPress={() => setDeletingIncome(item)}
          >
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Income Sources"
        subtitle="Track cash inflows & fund balances"
      />

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by source or notes..."
          placeholderTextColor={COLORS.textSubtle}
          clearButtonMode="while-editing"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterScrollWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value || 'all'}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = selectedStatus === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                ]}
                onPress={() => setSelectedStatus(item.value)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={incomes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderIncomeItem}
          contentContainerStyle={[
            styles.listContainer,
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
          ListEmptyComponent={
            <EmptyState
              title="No Incomes Found"
              description="Tap the + button to add a new income source."
              icon="💰"
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.fab, { bottom: insets.bottom + 70 }]}
        onPress={() => {
          setEditingIncome(null);
          setShowAddEditModal(true);
        }}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabText}>Add Income</Text>
      </TouchableOpacity>

      {/* Modals */}
      <AddEditIncomeModal
        visible={showAddEditModal}
        onClose={() => {
          setShowAddEditModal(false);
          setEditingIncome(null);
        }}
        income={editingIncome}
        onSuccess={fetchIncomes}
        allTags={allTags}
      />

      <ConfirmModal
        visible={!!deletingIncome}
        title="Delete Income"
        message={`Are you sure you want to delete "${deletingIncome?.source}"? All linked allocations will be removed.`}
        confirmText="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingIncome(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    paddingVertical: SPACING.sm + 2,
  },
  clearBtn: {
    padding: SPACING.xs,
  },
  clearBtnText: {
    color: COLORS.textMuted,
    fontSize: 18,
    lineHeight: 18,
  },
  filterScrollWrap: {
    marginVertical: SPACING.sm,
  },
  filterList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  filterPill: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  sourceWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  sourceTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateText: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginVertical: SPACING.xs,
  },
  amountCol: {
    alignItems: 'center',
  },
  amountLabel: {
    color: COLORS.textSubtle,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  progressWrap: {
    marginTop: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  tagChip: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    color: COLORS.primaryLight,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionLink: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.xs,
  },
  editActionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteActionText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: '#0d0f14',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  fabText: {
    color: '#0d0f14',
    fontSize: 13,
    fontWeight: '700',
  },
});
