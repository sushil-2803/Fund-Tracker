import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { api } from '../../api';
import { fmt, fmtDate, fmtDateTime, paymentMethodLabel } from '../../utils/formatters';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import CurrencyText from '../../components/common/CurrencyText';
import ConfirmModal from '../../components/common/ConfirmModal';
import AddEditExpenseModal from '../../components/modals/AddEditExpenseModal';
import AllocationModal from '../../components/modals/AllocationModal';
import { useToast } from '../../context/ToastContext';

export default function ExpenseDetailScreen({ route, navigation }) {
  const { expenseId } = route.params;
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [expense, setExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [deletingAllocation, setDeletingAllocation] = useState(null);
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await api.expenses.get(expenseId);
      setExpense(data);
    } catch (err) {
      showToast(err.message || 'Failed to load expense details', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [expenseId, showToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const handleRemoveAllocation = async () => {
    if (!deletingAllocation) return;
    setIsDeleting(true);
    try {
      await api.allocations.delete(deletingAllocation.id);
      showToast('Allocation removed successfully', 'success');
      setDeletingAllocation(null);
      fetchDetail();
    } catch (err) {
      showToast(err.message || 'Failed to remove allocation', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteExpense = async () => {
    setIsDeleting(true);
    try {
      await api.expenses.delete(expenseId);
      showToast('Expense deleted successfully', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense', 'error');
      setIsDeleting(false);
      setShowDeleteExpenseModal(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.danger} />
        <Text style={styles.loadingText}>Loading expense details...</Text>
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Expense record not found.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const settled = Number(expense.settled_amount || 0);
  const total = Number(expense.amount || 0);
  const pending = Number(expense.pending_amount || (total - settled));
  const allocations = expense.allocations || [];
  const isFullySettled = pending <= 0;

  return (
    <View style={styles.container}>
      <Header
        title={expense.title}
        subtitle="Expense Details & Settlement Breakdown"
        onBack={() => navigation.goBack()}
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
            tintColor={COLORS.danger}
            colors={[COLORS.danger]}
          />
        }
      >
        {/* Main Overview Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText}>{expense.title}</Text>
              <View style={styles.metaBadgeRow}>
                <Text style={styles.categoryTag}>{expense.category}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.dateText}>{fmtDate(expense.date)}</Text>
              </View>
            </View>
            <StatusBadge status={expense.status} />
          </View>

          {/* Breakdown 3-Grid */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>Total Cost</Text>
              <CurrencyText amount={total} size={16} color={COLORS.textPrimary} bold />
            </View>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>Settled</Text>
              <CurrencyText amount={settled} size={16} color={COLORS.success} bold />
            </View>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>Pending</Text>
              <CurrencyText amount={pending} size={16} color={COLORS.danger} bold />
            </View>
          </View>

          {/* Settlement Progress */}
          <View style={styles.progressWrap}>
            <ProgressBar
              used={settled}
              total={total}
              showLabel
              labelPrefix="Settlement"
              height={7}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.buttonActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.settleBtn,
                isFullySettled && styles.settleBtnDisabled,
              ]}
              onPress={() => setShowAllocateModal(true)}
              disabled={isFullySettled}
            >
              <Text style={styles.settleBtnText}>
                {isFullySettled ? '✓ Fully Settled' : '⇄ Settle / Link Funds'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.editBtn}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.deleteBtn}
              onPress={() => setShowDeleteExpenseModal(true)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Covered By Incomes Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Covered By Incomes ({allocations.length})
            </Text>
          </View>

          {allocations.length === 0 ? (
            <View style={styles.emptyAllocationsBox}>
              <Text style={styles.emptyAllocationsTitle}>No Funding Sources Linked</Text>
              <Text style={styles.emptyAllocationsDesc}>
                This expense has not been covered by any income yet. Tap "Settle / Link Funds" above to allocate.
              </Text>
            </View>
          ) : (
            <View style={styles.allocationsList}>
              {allocations.map((alloc) => (
                <View key={alloc.id} style={styles.allocCard}>
                  <View style={styles.allocLeft}>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('IncomesStack', {
                          screen: 'IncomeDetail',
                          params: { incomeId: alloc.income_id },
                        })
                      }
                    >
                      <Text style={styles.allocIncomeSource}>
                        {alloc.income_source || 'Income #' + alloc.income_id}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.allocMeta}>
                      Allocated on {fmtDate(alloc.created_at)}
                    </Text>
                    {alloc.note ? (
                      <Text style={styles.allocNote}>"{alloc.note}"</Text>
                    ) : null}
                  </View>

                  <View style={styles.allocRight}>
                    <CurrencyText
                      amount={alloc.amount}
                      color={COLORS.success}
                      size={15}
                      bold
                    />
                    <TouchableOpacity
                      style={styles.removeAllocBtn}
                      onPress={() => setDeletingAllocation(alloc)}
                    >
                      <Text style={styles.removeAllocText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Details, Notes & Metadata */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Details & Notes</Text>
          </View>

          <View style={styles.card}>
            {expense.notes ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Notes</Text>
                <Text style={styles.metaValue}>{expense.notes}</Text>
              </View>
            ) : null}

            {Array.isArray(expense.tags) && expense.tags.length > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tags</Text>
                <View style={styles.tagsRow}>
                  {expense.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>{expense.category}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Method</Text>
              <Text style={styles.metaValue}>{paymentMethodLabel(expense.payment_method)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaSubtle}>{fmtDateTime(expense.created_at)}</Text>
            </View>

            {expense.updated_at && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Last Updated</Text>
                <Text style={styles.metaSubtle}>{fmtDateTime(expense.updated_at)}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <AddEditExpenseModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        expense={expense}
        onSuccess={fetchDetail}
      />

      <AllocationModal
        visible={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        presetExpenseId={expense.id}
        onSuccess={fetchDetail}
      />

      <ConfirmModal
        visible={!!deletingAllocation}
        title="Remove Allocation"
        message={`Are you sure you want to remove the ${fmt(
          deletingAllocation?.amount
        )} allocation from "${deletingAllocation?.income_source}"?`}
        confirmText="Remove"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleRemoveAllocation}
        onCancel={() => setDeletingAllocation(null)}
      />

      <ConfirmModal
        visible={showDeleteExpenseModal}
        title="Delete Expense"
        message={`Are you sure you want to delete "${expense?.title}"? All allocations linked to this expense will be reverted.`}
        confirmText="Delete Expense"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteExpense}
        onCancel={() => setShowDeleteExpenseModal(false)}
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
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: 14,
  },
  notFoundText: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginBottom: SPACING.lg,
  },
  backBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  titleWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  titleText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTag: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  dotSeparator: {
    color: COLORS.textSubtle,
    marginHorizontal: 4,
  },
  dateText: {
    color: COLORS.textSubtle,
    fontSize: 13,
  },
  breakdownRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  breakdownBox: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownLabel: {
    color: COLORS.textSubtle,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  progressWrap: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  buttonActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  settleBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnDisabled: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settleBtnText: {
    color: '#0d0f14',
    fontSize: 13,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.dangerDim,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionWrap: {
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyAllocationsBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyAllocationsTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptyAllocationsDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  allocationsList: {
    gap: SPACING.sm,
  },
  allocCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  allocIncomeSource: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  allocMeta: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  allocNote: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  allocRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  removeAllocBtn: {
    paddingVertical: 2,
  },
  removeAllocText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaLabel: {
    color: COLORS.textSubtle,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  metaSubtle: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 2,
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
});
