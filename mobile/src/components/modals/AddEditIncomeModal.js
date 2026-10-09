import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { z } from 'zod';
import { Calendar, X, Plus, Check } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { fmt, todayISO } from '../../utils/formatters';
import TagInput from '../common/TagInput';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api';

const incomeSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount must be a valid number' }).positive('Amount must be greater than 0'),
  source: z.string().trim().min(1, 'Source is required').max(100, 'Source is too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  notes: z.string().optional(),
});

export default function AddEditIncomeModal({
  visible,
  onClose,
  income = null, // null for create, object for edit
  onSuccess,
  allTags = [],
}) {
  const { showToast } = useToast();
  const isEditing = !!income;

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (income) {
      setAmount(String(income.amount || ''));
      setSource(income.source || '');
      setDate(income.date ? String(income.date).slice(0, 10) : todayISO());
      setNotes(income.notes || '');
      setTags(Array.isArray(income.tags) ? income.tags : []);
    } else {
      setAmount('');
      setSource('');
      setDate(todayISO());
      setNotes('');
      setTags([]);
    }
    setErrorMsg('');
  }, [income, visible]);

  const allocatedAmount = income?.allocated_amount || 0;

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const parsedAmount = parseFloat(amount);

    const validationResult = incomeSchema.safeParse({
      amount: parsedAmount,
      source: source.trim(),
      date: date.trim(),
      notes: notes.trim() || undefined,
    });

    if (!validationResult.success) {
      setErrorMsg(validationResult.error.errors[0]?.message || 'Invalid input');
      return;
    }

    // Validation: cannot reduce amount below already allocated
    if (isEditing && parsedAmount < allocatedAmount) {
      setErrorMsg(
        `Amount cannot be less than already allocated sum (${fmt(allocatedAmount)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: parsedAmount,
        source: source.trim(),
        date: date.trim(),
        notes: notes.trim() || undefined,
        tags,
      };

      if (isEditing) {
        await api.incomes.update(income.id, payload);
        showToast('Income updated successfully', 'success');
      } else {
        await api.incomes.create(payload);
        showToast('Income created successfully', 'success');
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save income');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Income' : 'Add New Income'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isEditing ? 'Update existing income entry' : 'Log a new funding source'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScroll}
          >
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Amount Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Amount (₹) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textSubtle}
                  keyboardType="decimal-pad"
                />
              </View>
              {isEditing && allocatedAmount > 0 && (
                <Text style={styles.helperText}>
                  Min amount allowed: {fmt(allocatedAmount)} (already allocated)
                </Text>
              )}
            </View>

            {/* Source Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Source / Origin <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={source}
                onChangeText={setSource}
                placeholder="e.g. Salary, Client Payout, Bonus"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>

            {/* Date Input with Native Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={18} color={COLORS.primaryLight} />
                <Text style={styles.datePickerBtnText}>{date}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(date + 'T00:00:00')}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  themeVariant="dark"
                />
              )}
            </View>

            {/* Tags */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tags</Text>
              <TagInput
                tags={tags}
                onChangeTags={setTags}
                suggestions={allTags}
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add contextual details or remarks..."
                placeholderTextColor={COLORS.textSubtle}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsFooter}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0d0f14" />
              ) : (
                <View style={styles.btnRow}>
                  {isEditing ? <Check size={16} color="#0d0f14" /> : <Plus size={16} color="#0d0f14" />}
                  <Text style={styles.submitBtnText}>
                    {isEditing ? 'Save Changes' : 'Create Income'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formScroll: {
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerDim,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: 13,
  },
  fieldGroup: {
    gap: SPACING.xs + 2,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  required: {
    color: COLORS.danger,
  },
  helperText: {
    color: COLORS.warning,
    fontSize: 11,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    color: COLORS.primaryLight,
    fontSize: 18,
    fontWeight: '700',
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    minHeight: 75,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  datePickerBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionsFooter: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    color: '#0d0f14',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
