import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';

export default function TagInput({
  tags = [],
  onChangeTags,
  suggestions = [],
  placeholder = 'Add tags (press space or comma)...',
  maxTags = 10,
}) {
  const [inputText, setInputText] = useState('');

  const addTag = (text) => {
    const clean = text.trim().toLowerCase().replace(/^[#,]/, '');
    if (!clean) return;
    if (tags.length >= maxTags) return;
    if (!tags.includes(clean)) {
      onChangeTags([...tags, clean]);
    }
    setInputText('');
  };

  const removeTag = (indexToRemove) => {
    onChangeTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleInputChange = (val) => {
    if (val.endsWith(',') || val.endsWith(' ') || val.endsWith('\n')) {
      addTag(val.slice(0, -1));
    } else {
      setInputText(val);
    }
  };

  const handleBlur = () => {
    if (inputText.trim()) {
      addTag(inputText);
    }
  };

  // Filter suggestion candidates
  const availableSuggestions = (suggestions || [])
    .map((s) => (typeof s === 'string' ? s : s.name))
    .filter((s) => s && !tags.includes(s.toLowerCase()) && s.toLowerCase().includes(inputText.toLowerCase()))
    .slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Active Tags Chips */}
      <View style={styles.tagWrap}>
        {tags.map((tag, idx) => (
          <View key={`${tag}-${idx}`} style={styles.tagChip}>
            <Text style={styles.tagHash}>#</Text>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => removeTag(idx)}
              style={styles.removeBtn}
            >
              <Text style={styles.removeIcon}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Text Input */}
        {tags.length < maxTags && (
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleInputChange}
            onSubmitEditing={() => addTag(inputText)}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : 'Add more...'}
            placeholderTextColor={COLORS.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        )}
      </View>

      {/* Suggestions Row */}
      {availableSuggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
          contentContainerStyle={styles.suggestionsContent}
        >
          <Text style={styles.suggestionLabel}>Suggested:</Text>
          {availableSuggestions.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => addTag(s)}
              style={styles.suggestionChip}
            >
              <Text style={styles.suggestionText}>+{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 48,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    margin: 3,
  },
  tagHash: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  tagText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  removeBtn: {
    marginLeft: SPACING.xs,
    paddingLeft: 2,
  },
  removeIcon: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  input: {
    flex: 1,
    minWidth: 100,
    color: COLORS.textPrimary,
    fontSize: 13,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  suggestionsContainer: {
    marginTop: SPACING.xs,
  },
  suggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionLabel: {
    color: COLORS.textSubtle,
    fontSize: 11,
    marginRight: SPACING.xs,
  },
  suggestionChip: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginRight: SPACING.xs,
  },
  suggestionText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '500',
  },
});
