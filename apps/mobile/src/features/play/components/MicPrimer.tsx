import { StyleSheet, Text, View } from 'react-native';
import { Pip } from '@/shared/mascot';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = { onAllow: () => void; onType: () => void };

/**
 * Shown before the OS mic prompt on the first round (SCREENS.md → Mic permission).
 * Pip listens here because the screen is about listening.
 */
export function MicPrimer({ onAllow, onType }: Props) {
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.card}>
        <Pip mood="listening" size={sizes.pip.play} />
        <Text accessibilityRole="header" style={styles.title}>
          Blurt! needs your mic
        </Text>
        <Text style={styles.body}>
          It listens only while the mic button is on. Your voice stays on your phone when it can.
        </Text>
        <PrimaryButton label="Turn on the mic" onPress={onAllow} />
        <TextButton label="Type answers instead" tone="onLight" onPress={onType} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: surfaces.scrimStrong,
    justifyContent: 'center',
    padding: space.screen,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: space.s24,
    gap: space.s12,
    alignItems: 'center',
  },
  title: { ...textStyle('title'), color: colors.night, textAlign: 'center' },
  body: { ...textStyle('body'), color: colors.ink2, textAlign: 'center' },
});
