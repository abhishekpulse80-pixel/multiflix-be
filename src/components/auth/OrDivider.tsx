import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
};

export function OrDivider({ label }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8E8',
  },
  text: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9E9E9E',
  },
});
