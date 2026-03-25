import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../database/PreferencesContext';

type Item = {
  title: string;
  owner: string;
  status: string;
  progress: number;
};

type Props = {
  title: string;
  description: string;
  items: Item[];
};

export default function ProgressList({ title, description, items }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={`${item.title}-${item.owner}`} style={styles.item}>
            <View style={styles.itemTop}>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.owner}</Text>
              </View>
              <Text style={styles.itemStatus}>{item.status}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${item.progress}%`, backgroundColor: colors.secondary }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 360,
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
    list: {
      gap: 14,
    },
    item: {
      gap: 8,
    },
    itemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
    },
    itemCopy: {
      flex: 1,
      gap: 3,
    },
    itemTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    itemMeta: {
      color: colors.textLight,
      fontSize: 12,
    },
    itemStatus: {
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    track: {
      height: 8,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.inputBg,
    },
    fill: {
      height: '100%',
      borderRadius: 999,
    },
  });
}
