import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { fmt } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api';

function newExpenseRow(presetExpenseId = null) {
  return {
    id: Date.now() + Math.random(),
    expense_id: presetExpenseId || '',
    amount: '',
    note: '',
    showExpensePicker: false,
  };
}

export default function AllocationModal({
  visible,
  onClose,
  presetIncomeId = null,
  presetExpenseId = null,
  onSuccess,
}) {
  const { showToast } = useToast();

  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Single income selection shared across all expense rows
  const [incomeId, setIncomeId] = useState(presetIncomeId || '');
  const [showIncomePicker, setShowIncomePicker] = useState(false);

  // Expense rows — each has: expense_id, amount, note, showExpensePicker
  const [rows, setRows] = useState([newExpenseRow(presetExpenseId)]);

  const loadAvailableResources = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [incomesRes, expensesRes] = await Promise.all([
        api.incomes.list(),
        api.expenses.list(),
      ]);

      const availableIncomes = (incomesRes.data || incomesRes || []).filter(
        (i) => Number(i.remaining_amount) > 0 || (presetIncomeId && i.id === presetIncomeId)
      );

      const availableExpenses = (expensesRes.data || expensesRes || []).filter(
        (e) => Number(e.pending_amount) > 0 || (presetExpenseId && e.id === presetExpenseId)
      );

      setIncomes(availableIncomes);
      setExpenses(availableExpenses);
    } catch (err) {
      console.warn('Failed to load allocation resources:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [presetIncomeId, presetExpenseId]);

  useEffect(() => {
    if (visible) {
      loadAvailableResources();
      setIncomeId(presetIncomeId || '');
      setRows([newExpenseRow(presetExpenseId)]);
      setErrorMsg('');
      setShowIncomePicker(false);
    }
  }, [visible, presetIncomeId, presetExpenseId, loadAvailableResources]);

  // ── Lookups ──
  const incomeMap = useMemo(
    () => new Map(incomes.map((i) => [String(i.id), i])),
    [incomes]
  );
  const expenseMap = useMemo(
    () => new Map(expenses.map((e) => [String(e.id), e])),
    [expenses]
  );

  const selectedIncome = incomeMap.get(String(incomeId));

  // Total committed across all rows (excluding one row by id)
  const totalCommittedToIncome = useCallback(
    (exceptId) =>
      rows.reduce((sum, r) => {
        if (r.id === exceptId) return sum;
        return sum + (parseFloat(r.amount) || 0);
      }, 0),
    [rows]
  );

  // Amount committed to a specific expense (excluding one row by id)
  const committedToExpense = useCallback(
    (expId, exceptId) =>
      rows.reduce((sum, r) => {
        if (r.id === exceptId || String(r.expense_id) !== String(expId)) return sum;
        return sum + (parseFloat(r.amount) || 0);
      }, 0),
    [rows]
  );

  // Max allocatable for a specific row
  const calculateRowMax = useCallback(
    (row) => {
      if (!incomeId || !row.expense_id) return 0;
      const income = incomeMap.get(String(incomeId));
      const expense = expenseMap.get(String(row.expense_id));
      if (!income || !expense) return 0;

      const incomeLeft =
        Number(income.remaining_amount) - totalCommittedToIncome(row.id);
      const expenseLeft =
        Number(expense.pending_amount) - committedToExpense(row.expense_id, row.id);
      return Math.max(0, Math.min(incomeLeft, expenseLeft));
    },
    [incomeId, incomeMap, expenseMap, totalCommittedToIncome, committedToExpense]
  );

  // Remaining income balance after all current row entries
  const incomeRemainingLive = useMemo(() => {
    if (!selectedIncome) return 0;
    const committed = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    return Math.max(0, Number(selectedIncome.remaining_amount) - committed);
  }, [selectedIncome, rows]);



  const updateRow = (id, updates) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    setErrorMsg('');
  };

  const addRow = () => {
    setRows((prev) => [...prev, newExpenseRow()]);
    setErrorMsg('');
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setErrorMsg('');
  };

  const handleUseMax = (row) => {
    const max = calculateRowMax(row);
    if (max > 0) {
      updateRow(row.id, { amount: String(Math.floor(max * 100) / 100) });
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!incomeId) {
      setErrorMsg('Please select an income source first.');
      return;
    }

    const validAllocations = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.expense_id) {
        setErrorMsg(`Expense ${i + 1}: Please select an expense.`);
        return;
      }
      const amt = parseFloat(row.amount);
      if (isNaN(amt) || amt <= 0) {
        setErrorMsg(`Expense ${i + 1}: Please enter an amount greater than 0.`);
        return;
      }
      const maxLimit = calculateRowMax(row);
      if (amt > maxLimit + 0.001) {
        setErrorMsg(
          `Expense ${i + 1}: Amount (${fmt(amt)}) exceeds available limit of ${fmt(maxLimit)}.`
        );
        return;
      }
      validAllocations.push({
        income_id: incomeId,
        expense_id: row.expense_id,
        amount: amt,
        note: row.note?.trim() || undefined,
      });
    }

    if (validAllocations.length === 0) {
      setErrorMsg('Please add at least one expense allocation.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (validAllocations.length === 1) {
        await api.allocations.create(validAllocations[0]);
        showToast('Allocation recorded successfully', 'success');
      } else {
        await api.allocations.createBulk(validAllocations);
        showToast(`${validAllocations.length} allocations recorded successfully`, 'success');
      }
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save allocations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>New Allocation</Text>
              <Text style={styles.modalSubtitle}>
                Pick an income, then allocate to expenses
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
          </View>

          {isLoadingData ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loaderText}>Loading available funds & expenses...</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Error Banner */}
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>⚠ {errorMsg}</Text>
                </View>
              ) : null}

              {/* ── Income Section ── */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>
                  Income Source <Text style={styles.required}>*</Text>
                </Text>

                {incomes.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeTitle}>No Incomes with Available Funds</Text>
                    <Text style={styles.emptyNoticeDesc}>
                      Please add a new income or free up existing allocations.
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.pickerSelector}
                      onPress={() => {
                        if (!presetIncomeId) setShowIncomePicker((v) => !v);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerSelectedText,
                          !selectedIncome && styles.pickerPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedIncome
                          ? `${selectedIncome.source}`
                          : 'Select income source...'}
                      </Text>
                      {!presetIncomeId && (
                        <Text style={styles.dropdownArrow}>
                          {showIncomePicker ? '▲' : '▼'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {showIncomePicker && (
                      <View style={styles.pickerDropdown}>
                        <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                          {incomes.map((inc) => (
                            <TouchableOpacity
                              key={inc.id}
                              style={[
                                styles.dropdownOption,
                                String(incomeId) === String(inc.id) &&
                                  styles.dropdownOptionActive,
                              ]}
                              onPress={() => {
                                setIncomeId(inc.id);
                                setShowIncomePicker(false);
                                setErrorMsg('');
                              }}
                            >
                              <Text style={styles.optionTitle}>{inc.source}</Text>
                              <Text style={styles.optionSub}>
                                Remaining: {fmt(inc.remaining_amount)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Live balance summary */}
                    {selectedIncome && (
                      <View style={styles.balanceSummary}>
                        <View style={styles.balanceItem}>
                          <Text style={styles.balanceLabel}>Total</Text>
                          <Text style={styles.balanceValue}>
                            {fmt(selectedIncome.amount)}
                          </Text>
                        </View>
                        <View style={styles.balanceDivider} />
                        <View style={styles.balanceItem}>
                          <Text style={styles.balanceLabel}>Still Available</Text>
                          <Text
                            style={[
                              styles.balanceValue,
                              {
                                color:
                                  incomeRemainingLive > 0
                                    ? COLORS.success
                                    : COLORS.textSubtle,
                              },
                            ]}
                          >
                            {fmt(incomeRemainingLive)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* ── Section divider ── */}
              {selectedIncome && (
                <View style={styles.sectionDivider}>
                  <View style={styles.sectionDividerLine} />
                  <Text style={styles.sectionDividerText}>Allocate to expenses</Text>
                  <View style={styles.sectionDividerLine} />
                </View>
              )}

              {/* ── Expense Rows ── */}
              {selectedIncome &&
                (expenses.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeTitle}>No Unsettled Expenses</Text>
                    <Text style={styles.emptyNoticeDesc}>
                      All existing expenses are fully settled!
                    </Text>
                  </View>
                ) : (
                  rows.map((row, index) => {
                    const selectedExpense = expenseMap.get(String(row.expense_id));
                    const maxLimit = calculateRowMax(row);

                    return (
                      <View key={row.id} style={styles.expenseRowCard}>
                        {/* Row header */}
                        <View style={styles.rowHeader}>
                          <View style={styles.expenseIndexBadge}>
                            <Text style={styles.expenseIndexText}>
                              Expense {index + 1}
                            </Text>
                          </View>
                          {rows.length > 1 && (
                            <TouchableOpacity
                              onPress={() => removeRow(row.id)}
                              style={styles.removeRowBtn}
                            >
                              <Text style={styles.removeRowText}>Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Expense Picker */}
                        <View style={styles.fieldGroup}>
                          <Text style={styles.label}>
                            Expense <Text style={styles.required}>*</Text>
                          </Text>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.pickerSelector}
                            onPress={() => {
                              if (!presetExpenseId) {
                                updateRow(row.id, {
                                  showExpensePicker: !row.showExpensePicker,
                                });
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerSelectedText,
                                !selectedExpense && styles.pickerPlaceholder,
                              ]}
                              numberOfLines={1}
                            >
                              {selectedExpense
                                ? `${selectedExpense.title || selectedExpense.category} — Pending: ${fmt(
                                    Math.max(
                                      0,
                                      Number(selectedExpense.pending_amount) -
                                        committedToExpense(row.expense_id, row.id)
                                    )
                                  )}`
                                : 'Select expense to settle...'}
                            </Text>
                            {!presetExpenseId && (
                              <Text style={styles.dropdownArrow}>
                                {row.showExpensePicker ? '▲' : '▼'}
                              </Text>
                            )}
                          </TouchableOpacity>

                          {row.showExpensePicker && (
                            <View style={styles.pickerDropdown}>
                              <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                                {expenses.map((exp) => (
                                  <TouchableOpacity
                                    key={exp.id}
                                    style={[
                                      styles.dropdownOption,
                                      String(row.expense_id) === String(exp.id) &&
                                        styles.dropdownOptionActive,
                                    ]}
                                    onPress={() =>
                                      updateRow(row.id, {
                                        expense_id: exp.id,
                                        showExpensePicker: false,
                                      })
                                    }
                                  >
                                    <Text style={styles.optionTitle}>
                                      {exp.title || exp.category}
                                    </Text>
                                    <Text style={styles.optionSub}>
                                      {exp.category} • Pending: {fmt(exp.pending_amount)}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>

                        {/* Amount */}
                        <View style={styles.fieldGroup}>
                          <View style={styles.amountLabelRow}>
                            <Text style={styles.label}>
                              Amount <Text style={styles.required}>*</Text>
                            </Text>
                            {maxLimit > 0 && (
                              <TouchableOpacity
                                onPress={() => handleUseMax(row)}
                                style={styles.useMaxBtn}
                              >
                                <Text style={styles.useMaxText}>
                                  Use Max ({fmt(maxLimit)})
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.inputWrap}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                              style={styles.amountInput}
                              value={row.amount}
                              onChangeText={(val) => updateRow(row.id, { amount: val })}
                              placeholder="0.00"
                              placeholderTextColor={COLORS.textSubtle}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          {selectedExpense && maxLimit > 0 && (
                            <Text style={styles.limitHelperText}>
                              Max: {fmt(maxLimit)}
                            </Text>
                          )}
                        </View>

                        {/* Note */}
                        <View style={styles.fieldGroup}>
                          <Text style={styles.label}>Note (Optional)</Text>
                          <TextInput
                            style={styles.textInput}
                            value={row.note}
                            onChangeText={(val) => updateRow(row.id, { note: val })}
                            placeholder="e.g. Monthly electricity bill"
                            placeholderTextColor={COLORS.textSubtle}
                          />
                        </View>
                      </View>
                    );
                  })
                ))}

              {/* Add another expense button */}
              {selectedIncome && expenses.length > 0 && incomeRemainingLive > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.addRowButton}
                  onPress={addRow}
                >
                  <Text style={styles.addRowIcon}>＋</Text>
                  <Text style={styles.addRowText}>Add Another Expense</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.submitButton,
                (!incomeId || incomes.length === 0 || expenses.length === 0) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                isSubmitting ||
                !incomeId ||
                incomes.length === 0 ||
                expenses.length === 0
              }
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {rows.length > 1
                    ? `Confirm ${rows.length} Allocations`
                    : 'Confirm Allocation'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  loaderWrap: {
    padding: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: 13,
  },
  formScroll: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerDim,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyNotice: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  emptyNoticeTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptyNoticeDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Income section card ──
  sectionCard: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.danger,
  },

  // ── Live balance summary ──
  balanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  balanceLabel: {
    color: COLORS.textSubtle,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  balanceValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  // ── Section divider ──
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  sectionDividerText: {
    color: COLORS.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: SPACING.sm,
  },

  // ── Expense row card ──
  expenseRowCard: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  expenseIndexBadge: {
    backgroundColor: COLORS.accentBg,
    borderWidth: 1,
    borderColor: COLORS.accentDim,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  expenseIndexText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  removeRowBtn: {
    padding: SPACING.xs,
  },
  removeRowText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  useMaxBtn: {
    backgroundColor: COLORS.accentBg,
    borderWidth: 1,
    borderColor: COLORS.accentDim,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  useMaxText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  pickerSelectedText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  pickerPlaceholder: {
    color: COLORS.textSubtle,
  },
  dropdownArrow: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginLeft: SPACING.xs,
  },
  pickerDropdown: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 180,
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 180,
  },
  dropdownOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionActive: {
    backgroundColor: COLORS.bgDeep,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  optionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '700',
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: SPACING.md,
    fontWeight: '600',
  },
  limitHelperText: {
    color: COLORS.accent,
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 13,
  },

  // ── Add expense button ──
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accentDim,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.accentBg,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  addRowIcon: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: SPACING.xs,
  },
  addRowText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

