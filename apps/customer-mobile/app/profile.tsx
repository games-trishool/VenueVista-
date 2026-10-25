import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, serif, ui } from '../lib/theme';
import { useAppStore } from '../lib/store';
import { request } from '../lib/api';
import type { User } from '../lib/types';
import { Button, Divider, Icon, PageHeader } from '../components/ui';
import { PhoneSignIn } from '../components/phone-sign-in';
import { signOutPhoneAuth } from '../lib/phone-auth';
export default function Profile() {
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);
  const signOut = useAppStore((s) => s.signOut);
  const notify = useAppStore((s) => s.notify);
  const client = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dev = process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH === 'true';
  async function login() {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ accessToken: string; user: User }>('/auth/dev-session', {
        method: 'POST',
        body: { persona: 'customer' },
      });
      client.clear();
      await setSession(result.accessToken, result.user);
      notify('Development customer session started.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    await signOut();
    await signOutPhoneAuth().catch(() => undefined);
    client.clear();
    notify('You’re signed out. You can keep exploring.');
  }
  async function deleteAccount() {
    const remove = async () => {
      try {
        await request('/me', { method: 'DELETE' });
        await logout();
        notify(
          'Your account has been deactivated. Transaction records may be retained under the privacy policy.',
        );
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Unable to deactivate your account.');
      }
    };
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Deactivate your VenueVista account? You will be signed out. Enquiry and transaction records may be retained under the privacy policy.',
        )
      )
        await remove();
    } else
      Alert.alert(
        'Deactivate your account?',
        'You will be signed out. Enquiry and transaction records may be retained under the privacy policy.',
        [
          { text: 'Keep account', style: 'cancel' },
          { text: 'Deactivate', style: 'destructive', onPress: () => void remove() },
        ],
      );
  }
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={ui.content}>
        <PageHeader title="Your little corner" subtitle="Good things begin with you." />
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View
            style={{
              width: 85,
              height: 85,
              borderRadius: 43,
              backgroundColor: '#31213F',
              borderColor: '#70508B',
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="person-outline" size={34} color={colors.gold} />
          </View>
          <Text style={{ fontFamily: serif, color: colors.white, fontSize: 31, marginTop: 20 }}>
            {user
              ? `Hello, ${user.name ?? user.displayName ?? 'celebrator'}`
              : 'Make room for memories.'}
          </Text>
          <Text style={[ui.body, { textAlign: 'center', maxWidth: 330, marginTop: 10 }]}>
            {user
              ? 'Your favourites, plans and conversations. All together.'
              : 'Discover your next beautiful setting, then sign in to make it yours.'}
          </Text>
        </View>
        {user ? (
          <>
            <View style={[ui.card, { marginTop: 16 }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/enquiries')}
                style={[ui.row, { gap: 15, paddingVertical: 8 }]}
              >
                <Icon name="chatbubbles-outline" color={colors.accent} size={24} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>
                    Your enquiries
                  </Text>
                  <Text style={[ui.body, { fontSize: 11, marginTop: 4 }]}>
                    Quotes, conversations and site visits
                  </Text>
                </View>
                <Icon name="chevron-forward" size={17} />
              </Pressable>
              <Divider />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/wishlist')}
                style={[ui.row, { gap: 15, paddingVertical: 8 }]}
              >
                <Icon name="heart-outline" color="#DFA7BB" size={24} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>
                    Your wishlist
                  </Text>
                  <Text style={[ui.body, { fontSize: 11, marginTop: 4 }]}>
                    Beautiful places you’re keeping close
                  </Text>
                </View>
                <Icon name="chevron-forward" size={17} />
              </Pressable>
            </View>
            <View style={{ marginTop: 22 }}>
              <Button label="Sign out" secondary icon="log-out-outline" onPress={logout} />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={deleteAccount}
              style={{ padding: 20, alignItems: 'center' }}
            >
              <Text style={{ color: colors.danger, fontSize: 12 }}>Deactivate my account</Text>
            </Pressable>
          </>
        ) : (
          <View style={[ui.card, { marginTop: 14 }]}>
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: '600' }}>
              A place for your plans
            </Text>
            <Text style={[ui.body, { marginVertical: 15 }]}>
              Save favourite venues, request quotes, and keep every conversation in one place.
            </Text>
            <PhoneSignIn />
            {dev ? (
              <>
                <Divider />
                <View
                  style={{
                    padding: 12,
                    backgroundColor: '#352C1E',
                    borderRadius: 12,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ color: colors.gold, fontSize: 11, lineHeight: 18 }}>
                    DEVELOPMENT BUILD{'\n'}This local test session uses a seeded customer account.
                    No phone verification is performed.
                  </Text>
                </View>
                <Button
                  label="Use development customer"
                  loading={loading}
                  onPress={login}
                  icon="flask-outline"
                />
              </>
            ) : null}
            {error && (
              <Text
                accessibilityRole="alert"
                style={{ color: colors.danger, fontSize: 12, marginTop: 15 }}
              >
                {error}
              </Text>
            )}
          </View>
        )}
        <View style={{ marginTop: 25 }}>
          <Button label="Keep exploring" secondary onPress={() => router.replace('/')} />
        </View>
        <Divider />
        <Text style={[ui.body, { fontSize: 11, textAlign: 'center' }]}>
          VenueVista · v0.1.0{'\n'}Your phone number and enquiries are shared only through
          authorized venue conversations. No online payments are collected.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
