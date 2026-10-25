import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  bg: '#111015',
  surface: '#1C1923',
  elevated: '#25202F',
  border: '#322C3E',
  purple: '#916DFF',
  gold: '#D8B979',
  text: '#F6F3FB',
  muted: '#AAA3B7',
  green: '#78D8AC',
  red: '#F29AAB',
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 22,
    paddingBottom: 44,
    gap: 20,
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 14,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  heading: { fontSize: 20, color: colors.text, fontWeight: '600', letterSpacing: -0.4 },
  text: { fontSize: 15, lineHeight: 23, color: colors.text },
  muted: { fontSize: 14, lineHeight: 21, color: colors.muted },
  eyebrow: { fontSize: 10, letterSpacing: 2.5, fontWeight: '700', color: colors.gold },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 49,
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
});
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: 'row',
        gap: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 13,
        paddingHorizontal: 17,
        paddingVertical: 13,
        backgroundColor:
          variant === 'primary'
            ? colors.purple
            : variant === 'danger'
              ? '#42242F'
              : colors.elevated,
        opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={colors.text} />
      ) : null}
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#716A7F"
        selectionColor={colors.purple}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          props.style,
        ]}
      />
      {error ? (
        <Text style={{ color: colors.red, marginTop: 5, fontSize: 12 }}>{error}</Text>
      ) : null}
    </View>
  );
}
export function Notice({
  message,
  tone = 'muted',
}: {
  message: string;
  tone?: 'muted' | 'error' | 'success';
}) {
  return (
    <Text
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[
        styles.muted,
        { color: tone === 'error' ? colors.red : tone === 'success' ? colors.green : colors.muted },
      ]}
    >
      {message}
    </Text>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Card>
      <Ionicons name="cloud-offline-outline" color={colors.red} size={28} />
      <Text style={styles.heading}>Let’s reconnect</Text>
      <Text style={styles.muted}>
        {error instanceof Error ? error.message : 'This information could not be loaded.'}
      </Text>
      {retry ? <Button title="Try again" variant="secondary" onPress={retry} /> : null}
    </Card>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 14 }}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.muted}>Getting your workspace ready…</Text>
    </View>
  );
}
export function Empty({
  icon = 'sparkles-outline',
  title,
  text,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <Card style={{ paddingVertical: 35, alignItems: 'center' }}>
      <View
        style={{
          backgroundColor: '#302444',
          borderRadius: 20,
          width: 64,
          height: 64,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={colors.purple} />
      </View>
      <Text style={[styles.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.muted, { textAlign: 'center', maxWidth: 350 }]}>{text}</Text>
      {action}
    </Card>
  );
}
export function Badge({ status }: { status: string }) {
  const color =
    status === 'APPROVED' || status === 'CONFIRMED'
      ? colors.green
      : status === 'REJECTED' || status === 'CANCELLED'
        ? colors.red
        : colors.gold;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 7,
        backgroundColor: color + '18',
        paddingHorizontal: 9,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 }}>
        {status.replaceAll('_', ' ')}
      </Text>
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderRadius: 11,
        backgroundColor: selected ? '#362650' : colors.bg,
        borderWidth: 1,
        borderColor: selected ? colors.purple : colors.border,
      }}
    >
      <Text style={{ color: selected ? '#C9B3FF' : colors.muted, fontSize: 12, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}
