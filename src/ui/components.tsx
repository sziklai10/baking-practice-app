import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextProps, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KITCHEN_TAP_SIZE, space, type, useColors } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const c = useColors();
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.screenContent}>{children}</ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }]}>{children}</View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      {body}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'small';

export function T({ variant = 'body', muted, style, ...rest }: TextProps & { variant?: Variant; muted?: boolean }) {
  const c = useColors();
  return (
    <Text
      {...rest}
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : rest.accessibilityRole}
      style={[type[variant], { color: muted ? c.textMuted : c.text }, style]}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Extra context for screen readers, e.g. what the button will start. */
  hint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', hint, disabled, style }: ButtonProps) {
  const c = useColors();
  const palette = {
    primary: { bg: c.accent, fg: c.onAccent, border: c.accent },
    secondary: { bg: c.surface, fg: c.text, border: c.text },
    danger: { bg: c.danger, fg: c.onDanger, border: c.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[type.button, { color: palette.fg, textAlign: 'center' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, onPress, label }: { children: ReactNode; onPress?: () => void; label?: string }) {
  const c = useColors();
  const style = [styles.card, { backgroundColor: c.surface, borderColor: c.border }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

/** A labelled block such as "General advice", so readers always know what kind of content they're looking at. */
export function Section({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: space.sm }}>
        <T variant="heading">{title}</T>
        {tag ? <Tag label={tag} /> : null}
      </View>
      {children}
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={[styles.tag, { borderColor: c.textMuted }]}>
      <Text style={[type.small, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: space.xs }}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: space.sm }}>
          <T aria-hidden>•</T>
          <T style={{ flex: 1 }}>{item}</T>
        </View>
      ))}
    </View>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: c.notice }]}>
      <Text style={[type.body, { color: c.onNotice }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: space.md, gap: space.lg, paddingBottom: space.xl },
  button: {
    minHeight: KITCHEN_TAP_SIZE,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderWidth: 1, borderRadius: 14, padding: space.md, gap: space.sm },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: space.sm },
  notice: { borderRadius: 12, padding: space.md },
});
