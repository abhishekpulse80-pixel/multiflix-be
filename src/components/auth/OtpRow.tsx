import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';

const LINK = '#246BFD';
const TINT = '#F0F5FF';

type Props = {
  length?: number;
  onCodeChange: (code: string) => void;
};

export function OtpRow({ length = 4, onCodeChange }: Props) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length }, () => ''),
  );
  const digitsRef = useRef(digits);
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    digitsRef.current = digits;
  }, [digits]);

  const emit = useCallback(
    (next: string[]) => {
      onCodeChange(next.join(''));
    },
    [onCodeChange],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => inputs.current[0]?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const onChangeText = (index: number, text: string) => {
    setDigits(prev => {
      const next = [...prev];
      const cleaned = text.replace(/\D/g, '');
      if (text === '' || cleaned === '') {
        next[index] = '';
        emit(next);
        return next;
      }
      next[index] = cleaned.slice(-1);
      emit(next);
      if (next[index] && index < length - 1) {
        requestAnimationFrame(() => inputs.current[index + 1]?.focus());
      }
      return next;
    });
  };

  const onKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (
      e.nativeEvent.key === 'Backspace' &&
      !digitsRef.current[index] &&
      index > 0
    ) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((d, i) => {
        const focused = focusIndex === i;
        const filled = d.length > 0;
        return (
          <Pressable
            key={i}
            onPress={() => inputs.current[i]?.focus()}
            style={[
              styles.cell,
              focused && styles.cellFocused,
              filled && !focused && styles.cellFilled,
            ]}>
            <TextInput
              ref={r => {
                inputs.current[i] = r;
              }}
              value={d}
              onChangeText={text => onChangeText(i, text)}
              onKeyPress={e => onKeyPress(i, e)}
              onFocus={() => setFocusIndex(i)}
              onBlur={() => setFocusIndex(-1)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={styles.input}
              textAlign="center"
              accessibilityLabel={`Digit ${i + 1}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const CELL = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellFocused: {
    borderColor: LINK,
    backgroundColor: TINT,
  },
  cellFilled: {
    borderColor: '#E0E0E0',
  },
  input: {
    width: CELL - 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#0A0A0A',
    padding: 0,
  },
});
