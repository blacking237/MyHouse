import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type SelectOption = {
  label: string;
  value: string;
};

type Props = {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowCustomOption?: boolean;
  customOptionLabel?: string;
  customPlaceholder?: string;
  onAddCustomOption?: (value: string) => void;
};

export default function InlineSelectField({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  allowCustomOption = false,
  customOptionLabel = '+ Ajouter un nouveau type',
  customPlaceholder = 'Nouveau type',
  onAddCustomOption,
}: Props) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');

  const selected = options.find((option) => option.value === value)?.label ?? value;

  const handleAdd = () => {
    const next = customValue.trim();
    if (!next || !onAddCustomOption) {
      return;
    }
    onAddCustomOption(next);
    onChange(next);
    setCustomValue('');
    setAdding(false);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => {
          if (disabled) return;
          setOpen((current) => !current);
          setAdding(false);
        }}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]}>
          {value ? selected : placeholder ?? 'Selectionner'}
        </Text>
        <Text style={styles.chevron}>{open ? '^' : 'v'}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={styles.menu}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                  setAdding(false);
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}

          {allowCustomOption ? (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setAdding((current) => !current)}
              >
                <Text style={styles.addButtonText}>{customOptionLabel}</Text>
              </TouchableOpacity>
              {adding ? (
                <View style={styles.customBox}>
                  <TextInput
                    value={customValue}
                    onChangeText={setCustomValue}
                    style={styles.customInput}
                    placeholder={customPlaceholder}
                    placeholderTextColor={colors.textLight}
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    wrapper: {
      gap: 8,
    },
    trigger: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    triggerDisabled: {
      opacity: 0.6,
    },
    triggerText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    placeholderText: {
      color: colors.textLight,
      fontWeight: '500',
    },
    chevron: {
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '700',
      marginLeft: 12,
    },
    menu: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.cardBg,
      padding: 10,
      gap: 8,
    },
    option: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.inputBg,
    },
    optionActive: {
      backgroundColor: colors.primary,
    },
    optionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    optionTextActive: {
      color: colors.white,
    },
    addButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.background,
    },
    addButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    customBox: {
      gap: 8,
    },
    customInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
    },
    saveButton: {
      borderRadius: 10,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
