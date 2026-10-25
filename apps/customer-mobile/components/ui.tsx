import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors, serif, ui } from '../lib/theme';
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 20,
  color = colors.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  label,
  onPress,
  loading,
  secondary,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          {icon && <Icon name={icon} color={secondary ? colors.accent : colors.white} size={18} />}
          <Text style={[styles.buttonText, secondary && { color: colors.accent }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && <Icon name={icon} size={14} color={selected ? colors.white : colors.muted} />}
      <Text
        style={{ color: selected ? colors.white : colors.muted, fontSize: 12, fontWeight: '500' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function SectionTitle({
  title,
  detail,
  action,
  onPress,
}: {
  title: string;
  detail?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={{
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={ui.heading}>{title}</Text>
        {detail && <Text style={[ui.body, { marginTop: 4, fontSize: 12 }]}>{detail}</Text>}
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={[ui.row, { gap: 5, padding: 7 }]}
        >
          <Text style={{ fontSize: 12, color: colors.accent }}>{action}</Text>
          <Icon name="arrow-forward" size={16} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  description,
  action,
  onPress,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <LinearGradient colors={['#302442', '#1D1927']} style={styles.emptyIcon}>
        <Icon name={icon} color={colors.gold} size={30} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={[ui.body, { textAlign: 'center', maxWidth: 340, marginBottom: 16 }]}>
        {description}
      </Text>
      {action && onPress && <Button label={action} onPress={onPress} secondary />}
    </View>
  );
}
export function ErrorState({ message, retry }: { message?: string; retry: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Let’s try that again"
      description={message ?? 'We couldn’t load this right now. Check your connection.'}
      action="Try again"
      onPress={retry}
    />
  );
}
export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600', marginBottom: 9 }}>
        {label}
      </Text>
      {children}
      {error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 7 }}>{error}</Text>}
    </View>
  );
}
export function PageHeader({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={[ui.row, { paddingBottom: 26, gap: 14 }]}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.iconButton}
        >
          <Icon name="arrow-back" color={colors.white} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[ui.heading, { fontSize: 23 }]}>{title}</Text>
        {subtitle && <Text style={[ui.body, { fontSize: 12 }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 23 }} />;
}
export function LoginPrompt({
  description = 'Sign in to keep all your celebrations in one place.',
}: {
  description?: string;
}) {
  return (
    <EmptyState
      icon="person-outline"
      title="Make yourself at home"
      description={description}
      action="Go to your profile"
      onPress={() => router.push('/profile')}
    />
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 21,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
  },
  secondaryButton: { backgroundColor: '#292039', borderColor: '#514071', borderWidth: 1 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 25,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipSelected: { backgroundColor: '#4B3579', borderColor: '#8D6ED4' },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 34,
    backgroundColor: '#18151E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#493656',
  },
  emptyTitle: {
    fontFamily: serif,
    fontSize: 24,
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
