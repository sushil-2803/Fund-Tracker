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
import AddEditExpenseModal from '../../components/modals/AddEditExpenseModal';
import { useToast } from '../../context/ToastContext';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Partial', value: 'PARTIALLY_SETTLED' },
  { label: 'Settled', value: 'SETTLED' },
];

export default function ExpensesListScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const initialFilter = route.params?.filterStatus || '';

  const [expenses, setExpenses] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialFilter);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (route.params?.filterStatus !== undefined) {
      setSelectedStatus(route.params.filterStatus);
    }
  }, [route.params?.filterStatus]);

  const fetchExpenses = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;

      const [expensesData, tagsData] = await Promise.all([
        api.expenses.list(params),
        api.dashboard.tags().catch(() => []),
      ]);

      setExpenses(expensesData.data || expensesData || []);
      setAllTags(tagsData || []);
    } catch (err) {
      console.warn('Failed to fetch expenses:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowAddEditModal(true);
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await api.expenses.delete(deletingExpense.id);
      showToast('Expense deleted successfully', 'success');
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderExpenseItem = ({ item }) => {
    const settled = Number(item.settled_amount || 0);
    const total = Number(item.amount || 0);
    const pending = Number(item.pending_amount || (total - settled));

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.card}
        onPress={() =>
          navigation.navigate('ExpenseDetail', { expenseId: item.id })
        }
      >
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.categoryBadge}>{item.category}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.dateText}>{fmtDate(item.date)}</Text>
            </View>
            <Text style={styles.paymentMethodText}>
              {paymentMethodLabel(item.payment_method)} payment
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
            <Text style={styles.amountLabel}>Settled</Text>
            <CurrencyText amount={settled} size={14} color={COLORS.success} />
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Pending</Text>
            <CurrencyText amount={pending} size={14} color={COLORS.danger} bold />
          </View>
        </View>

        {/* Settlement Progress */}
        <View style={styles.progressWrap}>
          <ProgressBar
            used={settled}
            total={total}
            showLabel
            labelPrefix="Settlement"
            height={5}
          />
        </View>

        {/* Tags */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionLink}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.editActionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionLink}
            onPress={() => setDeletingExpense(item)}
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
        title="Expenses"
        subtitle="Manage spending & settlement status"
      />

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, category, notes..."
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
          <ActivityIndicator size="large" color={COLORS.danger} />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderExpenseItem}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + 90 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.danger}
              colors={[COLORS.danger]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Expenses Found"
              description="Tap + to record an expense."
              icon="💳"
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.fab, { bottom: insets.bottom + 70 }]}
        onPress={() => {
          setEditingExpense(null);
          setShowAddEditModal(true);
        }}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabText}>Add Expense</Text>
      </TouchableOpacity>

      {/* Modals */}
      <AddEditExpenseModal
        visible={showAddEditModal}
        onClose={() => {
          setShowAddEditModal(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onSuccess={fetchExpenses}
        allTags={allTags}
      />

      <ConfirmModal
        visible={!!deletingExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deletingExpense?.title}"? All linked allocations will be reverted.`}
        confirmText="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingExpense(null)}
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
    backgroundColor: COLORS.dangerDim,
    borderColor: COLORS.danger,
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
  titleWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '500',
  },
  dotSeparator: {
    color: COLORS.textSubtle,
    marginHorizontal: 4,
  },
  dateText: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  paymentMethodText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
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
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
