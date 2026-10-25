import { Platform, StyleSheet } from 'react-native';
export const colors = {
  bg: '#111015',
  surface: '#1C1923',
  elevated: '#25202F',
  accent: '#9C80FF',
  purple: '#7655E8',
  gold: '#D8B979',
  white: '#F9F7FC',
  muted: '#A7A3AF',
  border: '#332D3F',
  danger: '#F1A4AE',
  success: '#9FD3B4',
};
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 120, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '600', color: colors.white, letterSpacing: -1 },
  heading: { fontSize: 23, fontWeight: '600', color: colors.white, letterSpacing: -0.5 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  eyebrow: { color: colors.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2.4 },
  input: {
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
    backgroundColor: colors.surface,
    fontSize: 15,
    minHeight: 50,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
});
