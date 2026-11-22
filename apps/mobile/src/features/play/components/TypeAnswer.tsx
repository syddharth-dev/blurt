import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, textStyle } from '@/theme';

type Props = { onSubmit: (text: string) => void; onCancel?: () => void };

/** "Type it instead": same matching as voice (SCREENS.md). Always available. */
export function TypeAnswer({ onSubmit, onCancel }: Props) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  };
  return (
    <View style={styles.box}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        autoFocus
        placeholder="Type the term"
        placeholderTextColor={colors.ink2}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        accessibilityLabel="Type the term"
        style={styles.input}
      />
      <PrimaryButton label="Check" onPress={submit} />
      {onCancel ? <TextButton label="Use the mic" onPress={onCancel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.s12, alignItems: 'stretch' },
  input: {
    minHeight: sizes.primaryButtonHeight,
    borderRadius: radius.button,
    backgroundColor: colors.white,
    paddingHorizontal: space.s20,
    ...textStyle('title'),
    color: colors.night,
  },
});
