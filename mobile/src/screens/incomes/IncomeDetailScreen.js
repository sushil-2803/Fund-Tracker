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
import AddEditIncomeModal from '../../components/modals/AddEditIncomeModal';
import AllocationModal from '../../components/modals/AllocationModal';
import { useToast } from '../../context/ToastContext';

export default function IncomeDetailScreen({ route, navigation }) {
  const { incomeId } = route.params;
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [income, setIncome] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [deletingAllocation, setDeletingAllocation] = useState(null);
  const [showDeleteIncomeModal, setShowDeleteIncomeModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await api.incomes.get(incomeId);
      setIncome(data);
    } catch (err) {
      showToast(err.message || 'Failed to load income details', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [incomeId, showToast]);

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

  const handleDeleteIncome = async () => {
    setIsDeleting(true);
    try {
      await api.incomes.delete(incomeId);
      showToast('Income deleted successfully', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err.message || 'Failed to delete income', 'error');
      setIsDeleting(false);
      setShowDeleteIncomeModal(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!income) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Income record not found.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allocated = Number(income.allocated_amount || 0);
  const total = Number(income.amount || 0);
  const remaining = Number(income.remaining_amount || (total - allocated));
  const allocations = income.allocations || [];

  return (
    <View style={styles.container}>
      <Header
        title={income.source}
        subtitle="Income Details & Fund Allocations"
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
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Top Info Strip */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText}>{income.source}</Text>
              <Text style={styles.dateText}>Logged on {fmtDate(income.date)}</Text>
            </View>
            <StatusBadge status={income.status} />
          </View>

          {/* Breakdown 3-Grid */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>Total Amount</Text>
              <CurrencyText amount={total} size={16} color={COLORS.textPrimary} bold />
            </View>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>Allocated</Text>
              <CurrencyText amount={allocated} size={16} color={COLORS.accent} bold />
            </View>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>Available</Text>
              <CurrencyText amount={remaining} size={16} color={COLORS.success} bold />
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressWrap}>
            <ProgressBar
              used={allocated}
              total={total}
              showLabel
              labelPrefix="Usage"
              height={7}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.buttonActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.allocateBtn,
                remaining <= 0 && styles.allocateBtnDisabled,
              ]}
              onPress={() => setShowAllocateModal(true)}
              disabled={remaining <= 0}
            >
              <Text style={styles.allocateBtnText}>
                {remaining > 0 ? '⇄ Allocate Funds' : 'Fully Allocated'}
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
              onPress={() => setShowDeleteIncomeModal(true)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Linked Allocations Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Linked Expenses ({allocations.length})
            </Text>
          </View>

          {allocations.length === 0 ? (
            <View style={styles.emptyAllocationsBox}>
              <Text style={styles.emptyAllocationsTitle}>No Allocations Yet</Text>
              <Text style={styles.emptyAllocationsDesc}>
                This income has not been linked to cover any expense yet.
              </Text>
            </View>
          ) : (
            <View style={styles.allocationsList}>
              {allocations.map((alloc) => (
                <View key={alloc.id} style={styles.allocCard}>
                  <View style={styles.allocLeft}>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('ExpensesStack', {
                          screen: 'ExpenseDetail',
                          params: { expenseId: alloc.expense_id },
                        })
                      }
                    >
                      <Text style={styles.allocExpenseTitle}>
                        {alloc.expense_title || 'Expense #' + alloc.expense_id}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.allocMeta}>
                      {alloc.expense_category || 'General'} • {fmtDate(alloc.created_at)}
                    </Text>
                    {alloc.note ? (
                      <Text style={styles.allocNote}>"{alloc.note}"</Text>
                    ) : null}
                  </View>

                  <View style={styles.allocRight}>
                    <CurrencyText
                      amount={alloc.amount}
                      color={COLORS.accent}
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

        {/* Notes & Metadata */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Details & Notes</Text>
          </View>

          <View style={styles.card}>
            {income.notes ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Notes</Text>
                <Text style={styles.metaValue}>{income.notes}</Text>
              </View>
            ) : null}

            {Array.isArray(income.tags) && income.tags.length > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tags</Text>
                <View style={styles.tagsRow}>
                  {income.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Method</Text>
              <Text style={styles.metaValue}>{paymentMethodLabel(income.payment_method)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaSubtle}>{fmtDateTime(income.created_at)}</Text>
            </View>

            {income.updated_at && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Last Updated</Text>
                <Text style={styles.metaSubtle}>{fmtDateTime(income.updated_at)}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <AddEditIncomeModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        income={income}
        onSuccess={fetchDetail}
      />

      <AllocationModal
        visible={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        presetIncomeId={income.id}
        onSuccess={fetchDetail}
      />

      <ConfirmModal
        visible={!!deletingAllocation}
        title="Remove Allocation"
        message={`Are you sure you want to remove the ${fmt(
          deletingAllocation?.amount
        )} allocation to "${deletingAllocation?.expense_title}"?`}
        confirmText="Remove"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleRemoveAllocation}
        onCancel={() => setDeletingAllocation(null)}
      />

      <ConfirmModal
        visible={showDeleteIncomeModal}
        title="Delete Income"
        message={`Are you sure you want to delete "${income?.source}"? All allocations from this income will also be deleted.`}
        confirmText="Delete Income"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteIncome}
        onCancel={() => setShowDeleteIncomeModal(false)}
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: '#0d0f14',
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
    marginBottom: 2,
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
  allocateBtn: {
    flex: 2,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocateBtnDisabled: {
    opacity: 0.5,
  },
  allocateBtnText: {
    color: COLORS.white,
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
  allocExpenseTitle: {
    color: COLORS.primaryLight,
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
