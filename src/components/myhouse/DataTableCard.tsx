import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type Column = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

type Row = Record<string, string>;

type Props = {
  title: string;
  description: string;
  columns: Column[];
  rows: Row[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  getRowKey?: (row: Row, index: number) => string;
  selectedRowKey?: string | null;
  onRowPress?: (row: Row, index: number) => void;
};

export default function DataTableCard({
  title,
  description,
  columns,
  rows,
  searchable = false,
  searchPlaceholder = 'Rechercher...',
  emptyText = 'Aucune ligne a afficher.',
  getRowKey,
  selectedRowKey,
  onRowPress,
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return rows;
    }
    return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(trimmed)));
  }, [query, rows]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {searchable ? (
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textLight}
        />
      ) : null}

      <View style={styles.table}>
        <View style={styles.headerRow}>
          {columns.map((column) => (
            <Text
              key={column.key}
              style={[
                styles.headerCell,
                column.align === 'right' ? styles.right : styles.left,
              ]}
            >
              {column.label}
            </Text>
          ))}
        </View>

        <ScrollView style={styles.bodyScroll} nestedScrollEnabled>
          {filteredRows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : null}
          {filteredRows.map((row, index) => (
            <TouchableOpacity
              key={getRowKey ? getRowKey(row, index) : `${row[columns[0]?.key] ?? 'row'}-${index}`}
              style={[
                styles.bodyRow,
                onRowPress && styles.bodyRowInteractive,
                selectedRowKey != null
                  && (getRowKey ? getRowKey(row, index) : `${row[columns[0]?.key] ?? 'row'}-${index}`) === selectedRowKey
                  && styles.bodyRowSelected,
              ]}
              disabled={!onRowPress}
              onPress={() => onRowPress?.(row, index)}
            >
              {columns.map((column) => (
                <Text
                  key={column.key}
                  style={[
                    styles.bodyCell,
                    column.align === 'right' ? styles.right : styles.left,
                  ]}
                >
                  {row[column.key] ?? '-'}
                </Text>
              ))}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 520,
      backgroundColor: colors.cardBg,
      borderRadius: 22,
      padding: 20,
      gap: 14,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    description: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 14,
    },
    table: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    bodyScroll: {
      maxHeight: 360,
    },
    headerRow: {
      flexDirection: 'row',
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    bodyRow: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    bodyRowInteractive: {
      cursor: 'pointer' as any,
    },
    bodyRowSelected: {
      backgroundColor: colors.inputBg,
    },
    emptyRow: {
      paddingHorizontal: 14,
      paddingVertical: 18,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    emptyText: {
      color: colors.textLight,
      fontSize: 13,
      textAlign: 'center',
    },
    headerCell: {
      flex: 1,
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    bodyCell: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    left: {
      textAlign: 'left',
    },
    right: {
      textAlign: 'right',
    },
  });
}
