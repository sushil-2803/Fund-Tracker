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
import { fmt, fmtDate } from '../../utils/formatters';
import Header from '../../components/common/Header';
import CurrencyText from '../../components/common/CurrencyText';
import EmptyState from '../../components/common/EmptyState';
import ConfirmModal from '../../components/common/ConfirmModal';
import AllocationModal from '../../components/modals/AllocationModal';
import { useToast } from '../../context/ToastContext';

export default function AllocationsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [deletingAllocation, setDeletingAllocation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAllocations = useCallback(async () => {
    try {
      const data = await api.allocations.list();
      setAllocations(data.data || data || []);
    } catch (err) {
      console.warn('Failed to fetch allocations:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllocations();
  };

  const handleDelete = async () => {
    if (!deletingAllocation) return;
    setIsDeleting(true);
    try {
      await api.allocations.delete(deletingAllocation.id);
      showToast('Allocation removed successfully', 'success');
      setDeletingAllocation(null);
      fetchAllocations();
    } catch (err) {
      showToast(err.message || 'Failed to remove allocation', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter allocations locally by search term
  const filteredAllocations = allocations.filter((a) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const source = (a.income_source || '').toLowerCase();
    const title = (a.expense_title || '').toLowerCase();
    const cat = (a.expense_category || '').toLowerCase();
    const note = (a.note || '').toLowerCase();
    return (
      source.includes(query) ||
      title.includes(query) ||
      cat.includes(query) ||
      note.includes(query)
    );
  });

  const totalAllocatedSum = filteredAllocations.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0
  );

  const renderAllocationItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.linkRow}>
          {/* Income Tag */}
          <TouchableOpacity
            style={styles.entityPill}
            onPress={() =>
              navigation.navigate('IncomesStack', {
                screen: 'IncomeDetail',
                params: { incomeId: item.income_id },
              })
            }
          >
            <Text style={styles.incomeSourceText} numberOfLines={1}>
              {item.income_source || 'Income #' + item.income_id}
            </Text>
          </TouchableOpacity>

          <Text style={styles.arrowIcon}>➔</Text>

          {/* Expense Tag */}
          <TouchableOpacity
            style={styles.entityPill}
            onPress={() =>
              navigation.navigate('ExpensesStack', {
                screen: 'ExpenseDetail',
                params: { expenseId: item.expense_id },
              })
            }
          >
            <Text style={styles.expenseTitleText} numberOfLines={1}>
              {item.expense_title || 'Expense #' + item.expense_id}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteIconBtn}
          onPress={() => setDeletingAllocation(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteIcon}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Middle Row: Category & Date */}
      <View style={styles.cardMiddle}>
        {item.expense_category ? (
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.expense_category}</Text>
          </View>
        ) : null}
        <Text style={styles.dateText}>{fmtDate(item.created_at)}</Text>
      </View>

      {/* Note if available */}
      {item.note ? (
        <Text style={styles.noteText}>"{item.note}"</Text>
      ) : null}

      {/* Bottom: Amount */}
      <View style={styles.cardBottom}>
        <Text style={styles.allocatedLabel}>Amount Allocated</Text>
        <CurrencyText
          amount={item.amount}
          color={COLORS.accent}
          size={16}
          bold
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Allocations"
        subtitle="Linked funds & expense settlements"
      />

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Filter by income, expense, category or note..."
          placeholderTextColor={COLORS.textSubtle}
          clearButtonMode="while-editing"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredAllocations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAllocationItem}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + 140 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Allocations Found"
              description="Tap + Allocate to match available funds to expenses."
              icon="⇄"
            />
          }
        />
      )}

      {/* Bottom Total Summary Strip */}
      <View style={[styles.bottomStrip, { bottom: insets.bottom + 64 }]}>
        <View>
          <Text style={styles.summaryLabel}>Total Allocated</Text>
          <Text style={styles.summaryCount}>
            {filteredAllocations.length} transaction
            {filteredAllocations.length === 1 ? '' : 's'}
          </Text>
        </View>
        <CurrencyText
          amount={totalAllocatedSum}
          color={COLORS.accent}
          size={18}
          bold
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.fab, { bottom: insets.bottom + 125 }]}
        onPress={() => setShowAllocateModal(true)}
      >
        <Text style={styles.fabIcon}>⇄</Text>
        <Text style={styles.fabText}>Allocate</Text>
      </TouchableOpacity>

      {/* Modals */}
      <AllocationModal
        visible={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        onSuccess={fetchAllocations}
      />

      <ConfirmModal
        visible={!!deletingAllocation}
        title="Remove Allocation"
        message={`Are you sure you want to remove the ${fmt(
          deletingAllocation?.amount
        )} link between "${deletingAllocation?.income_source}" and "${
          deletingAllocation?.expense_title
        }"?`}
        confirmText="Remove"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAllocation(null)}
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
    marginBottom: SPACING.sm,
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  entityPill: {
    flexShrink: 1,
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  incomeSourceText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  arrowIcon: {
    color: COLORS.textSubtle,
    marginHorizontal: 6,
    fontSize: 12,
  },
  expenseTitleText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteIconBtn: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    color: COLORS.danger,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  cardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  catBadge: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  catText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  dateText: {
    color: COLORS.textSubtle,
    fontSize: 11,
  },
  noteText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  allocatedLabel: {
    color: COLORS.textSubtle,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bottomStrip: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCount: {
    color: COLORS.textSubtle,
    fontSize: 11,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
