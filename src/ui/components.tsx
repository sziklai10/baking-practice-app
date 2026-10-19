import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextProps, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorsOverride, KITCHEN_TAP_SIZE, fonts, radius, space, type, useColors } from './theme';
import type { Colors } from './theme';

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

type Variant = 'title' | 'heading' | 'body' | 'small' | 'eyebrow';

export function T({
  variant = 'body',
  muted,
  bold,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean; bold?: boolean }) {
  const c = useColors();
  const color = variant === 'eyebrow' ? c.eyebrow : muted ? c.textMuted : c.text;
  return (
    <Text
      {...rest}
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : rest.accessibilityRole}
      style={[type[variant], { color }, bold ? { fontFamily: fonts.bold } : null, style]}
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
    secondary: { bg: 'transparent', fg: c.text, border: c.border },
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

const heroColors = (c: Colors): Colors => ({
  ...c,
  background: c.hero,
  surface: c.hero,
  text: c.onHero,
  textMuted: c.onHero,
  eyebrow: c.heroEyebrow,
  border: c.onHero,
  accent: c.heroEyebrow,
  onAccent: c.hero,
});

/**
 * A rounded panel. `hero` is the dark Cocoa card for the one thing to do next;
 * everything inside it switches to light-on-dark colours.
 */
export function Card({
  children,
  onPress,
  label,
  hero,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  hero?: boolean;
}) {
  const c = useColors();
  const style = [styles.card, { backgroundColor: hero ? c.hero : c.surface }];
  const body = !onPress ? (
    <View style={style}>{children}</View>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
  );
  return hero ? <ColorsOverride value={heroColors(c)}>{body}</ColorsOverride> : body;
}

/** A labelled block such as "General advice", so readers always know what kind of content they're looking at. */
export function Section({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
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
    <View style={[styles.tag, { borderColor: c.border }]}>
      <Text style={[type.small, { color: c.text, fontFamily: fonts.bold }]}>{label}</Text>
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

/** One big tappable option. Chosen ones get a Crust fill, a thicker outline, bold text and a written tick. */
function Option({
  role,
  label,
  detail,
  chosen,
  onPress,
}: {
  role: 'radio' | 'checkbox';
  label: string;
  detail?: string;
  chosen: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const fg = chosen ? c.onHighlight : c.text;
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={onPress}
      style={[
        styles.option,
        {
          borderColor: c.border,
          backgroundColor: chosen ? c.highlight : c.surface,
          borderWidth: chosen ? 4 : 2,
          paddingHorizontal: chosen ? space.md - 2 : space.md,
        },
      ]}
    >
      <View style={{ flex: 1, paddingVertical: space.sm }}>
        <Text style={[type.body, { color: fg, fontFamily: chosen ? fonts.bold : fonts.body }]}>{label}</Text>
        {detail ? <Text style={[type.small, { color: fg }]}>{detail}</Text> : null}
      </View>
      {chosen ? (
        <Text style={[type.small, { color: fg, fontFamily: fonts.bold }]}>✓ Selected</Text>
      ) : (
        <View
          style={[styles.mark, { borderColor: c.border, borderRadius: role === 'radio' ? radius.pill : 6 }]}
        />
      )}
    </Pressable>
  );
}

/** A list of large radio options. */
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
  return (
    <View style={{ gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <T variant="heading">{label}</T>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <Option
            key={o.value}
            role="radio"
            label={o.label}
            detail={o.detail}
            chosen={selected}
            onPress={() => onChange(selected && allowNone ? null : o.value)}
          />
        );
      })}
    </View>
  );
}

/** Large tick boxes for choosing any number of options. */
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
  return (
    <View style={{ gap: space.sm }} accessibilityLabel={label}>
      <T variant="heading">{label}</T>
      {options.map((o) => {
        const checked = values.includes(o.value);
        return (
          <Option
            key={o.value}
            role="checkbox"
            label={o.label}
            detail={o.detail}
            chosen={checked}
            onPress={() => onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
          />
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
      style={[styles.option, { borderColor: c.border, backgroundColor: c.surface, borderWidth: 2, gap: space.md }]}
    >
      <View style={{ flex: 1, paddingVertical: space.sm }}>
        <Text style={[type.body, { color: c.text, fontFamily: fonts.bold }]}>{label}</Text>
        {detail ? <Text style={[type.small, { color: c.textMuted }]}>{detail}</Text> : null}
      </View>
      <View
        style={[styles.toggleState, { backgroundColor: value ? c.accent : 'transparent', borderColor: c.border }]}
      >
        <Text style={[type.small, { color: value ? c.onAccent : c.text, fontFamily: fonts.bold }]}>
          {value ? 'On' : 'Off'}
        </Text>
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
    gap: space.sm,
  },
  mark: { width: 26, height: 26, borderWidth: 2 },
  toggleState: {
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    minWidth: 64,
    alignItems: 'center',
  },
  screenContent: { paddingHorizontal: space.md + 4, paddingTop: space.md, gap: space.lg, paddingBottom: space.xl * 2 },
  button: {
    minHeight: KITCHEN_TAP_SIZE,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: radius.lg, padding: space.lg - 4, gap: space.sm + 4 },
  tag: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: space.sm + 4, paddingVertical: 4 },
  notice: { borderRadius: radius.sm, padding: space.md },
});
