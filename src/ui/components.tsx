import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextProps, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KITCHEN_TAP_SIZE, radius, space, type, useColors } from './theme';
import type { Colors } from './theme';

/** A soft drop shadow instead of hard borders. Borders stay for dark mode, where shadows barely show. */
const lift = (c: Colors) => ({
  shadowColor: c.shadow,
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
});

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
    secondary: { bg: c.surface, fg: c.accent, border: c.accent },
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
  const style = [styles.card, lift(c), { backgroundColor: c.surface, borderColor: c.border }];
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
    <View style={[styles.tag, { backgroundColor: c.accentSoft }]}>
      <Text style={[type.small, { color: c.text, fontWeight: '600' }]}>{label}</Text>
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

export type Choice<V extends string> = { value: V; label: string; detail?: string };

/** A list of large radio options. The choice is shown by a tick and bold text, not colour alone. */
export function Choices<V extends string>({
  label,
  options,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  options: Choice<V>[];
  value: V | null;
  onChange: (v: V | null) => void;
  /** Tapping the selected option again clears it. */
  allowNone?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <T variant="heading">{label}</T>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.detail ? `${o.label}. ${o.detail}` : o.label}
            onPress={() => onChange(selected && allowNone ? null : o.value)}
            style={[
              styles.option,
              { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentSoft : c.surface, borderWidth: selected ? 3 : 1 },
            ]}
          >
            <Text style={[type.body, { color: c.text, width: 28 }]}>{selected ? '✓' : ''}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: c.text, fontWeight: selected ? '700' : '400' }]}>{o.label}</Text>
              {o.detail ? <Text style={[type.small, { color: c.textMuted }]}>{o.detail}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Large tick boxes for choosing any number of options. Ticked ones show a tick and bold text, not colour alone. */
export function Checklist<V extends string>({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: Choice<V>[];
  values: V[];
  onChange: (v: V[]) => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }} accessibilityLabel={label}>
      <T variant="heading">{label}</T>
      {options.map((o) => {
        const checked = values.includes(o.value);
        return (
          <Pressable
            key={o.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={o.detail ? `${o.label}. ${o.detail}` : o.label}
            onPress={() => onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
            style={[
              styles.option,
              { borderColor: checked ? c.accent : c.border, backgroundColor: checked ? c.accentSoft : c.surface, borderWidth: checked ? 3 : 1 },
            ]}
          >
            <Text style={[type.body, { color: c.text, width: 28 }]}>{checked ? '✓' : ''}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: c.text, fontWeight: checked ? '700' : '400' }]}>{o.label}</Text>
              {o.detail ? <Text style={[type.small, { color: c.textMuted }]}>{o.detail}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** An on/off setting with its state written out, so it reads without colour. */
export function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={() => onChange(!value)}
      style={[styles.option, { borderColor: c.border, backgroundColor: c.surface, borderWidth: 1, gap: space.md }]}
    >
      <View style={{ flex: 1, paddingVertical: space.sm }}>
        <Text style={[type.body, { color: c.text, fontWeight: '700' }]}>{label}</Text>
        {detail ? <Text style={[type.small, { color: c.textMuted }]}>{detail}</Text> : null}
      </View>
      <View
        style={[styles.toggleState, { backgroundColor: value ? c.accent : c.background, borderColor: value ? c.accent : c.text }]}
      >
        <Text style={[type.small, { color: value ? c.onAccent : c.text, fontWeight: '700' }]}>{value ? 'On' : 'Off'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: KITCHEN_TAP_SIZE,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleState: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, minWidth: 64, alignItems: 'center' },
  screenContent: { paddingHorizontal: space.lg - 4, paddingTop: space.md, gap: space.lg, paddingBottom: space.xl * 2 },
  button: {
    minHeight: KITCHEN_TAP_SIZE,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.lg - 4, gap: space.sm },
  tag: { borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 2 },
  notice: { borderRadius: radius.md, padding: space.md },
});
