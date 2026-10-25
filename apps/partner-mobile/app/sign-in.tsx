import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, DEV_AUTH, errorMessage } from '../src/api';
import { useSession } from '../src/session';
import type { Session } from '../src/types';
import { Button, Card, colors, Field, Notice, Screen, styles } from '../src/ui';
import { phoneAuthStatus, sendPhoneOtp, signOutPhoneProvider } from '../src/phone-auth';
import type { PhoneConfirmation } from '../src/phone-auth.types';
export default function SignIn() {
  const { token, user, signIn, storageError } = useSession();
  const client = useQueryClient();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const confirmation = useRef<PhoneConfirmation | null>(null);
  const verifiedToken = useRef<string | null>(null);
  const alive = useRef(true);
  const status = phoneAuthStatus();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      confirmation.current?.cancel();
      void signOutPhoneProvider().catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  async function acceptSession(session: Session) {
    await signIn(session);
    client.clear();
  }
  const send = useMutation({
    mutationFn: async () => {
      const digits = phone.replace(/[\s()-]/g, '');
      const normalized = /^\d{10}$/.test(digits) ? `+91${digits}` : digits;
      const previous = confirmation.current;
      const challenge = await sendPhoneOtp(normalized);
      if (!alive.current) {
        challenge.cancel();
        return;
      }
      previous?.cancel();
      confirmation.current = challenge;
      verifiedToken.current = null;
      setSentTo(normalized);
      setCode('');
      setResendAt(Date.now() + 60_000);
    },
  });
  const verify = useMutation({
    mutationFn: async () => {
      if (!confirmation.current) throw new Error('Request a verification code first.');
      const idToken = verifiedToken.current || (await confirmation.current.confirm(code));
      verifiedToken.current = idToken;
      const session = await api<Session>('/auth/firebase', { method: 'POST', body: { idToken } });
      confirmation.current.cancel();
      confirmation.current = null;
      verifiedToken.current = null;
      await acceptSession(session);
      await signOutPhoneProvider().catch(() => undefined);
    },
  });
  const login = useMutation({
    mutationFn: async () => {
      const session = await api<Session>('/auth/dev-session', {
        method: 'POST',
        body: { persona: 'owner' },
      });
      await acceptSession(session);
    },
  });
  const busy = send.isPending || verify.isPending || login.isPending;
  function changeNumber() {
    confirmation.current?.cancel();
    confirmation.current = null;
    verifiedToken.current = null;
    setSentTo('');
    setCode('');
    send.reset();
    verify.reset();
    void signOutPhoneProvider().catch(() => undefined);
  }
  if (token) return <Redirect href={user?.role === 'CUSTOMER' ? '/account' : '/'} />;
  return (
    <Screen>
      <View style={{ marginTop: 22, gap: 10 }}>
        <Text style={styles.eyebrow}>VENUEVISTA / PARTNER</Text>
        <Text style={[styles.title, { fontSize: 39, lineHeight: 46 }]}>
          Your venue.{'\n'}Their next big moment.
        </Text>
        <Text style={[styles.muted, { maxWidth: 410 }]}>
          A thoughtful workspace to showcase your spaces, meet new customers, and turn enquiries
          into celebrations.
        </Text>
      </View>
      <LinearGradient
        colors={['#35214E', '#1D1925']}
        style={{
          borderRadius: 26,
          minHeight: 180,
          padding: 25,
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: '#503769',
        }}
      >
        <View style={styles.row}>
          <Ionicons name="business-outline" color={colors.gold} size={31} />
          <Text style={[styles.text, { fontWeight: '600' }]}>Built for venue owners</Text>
        </View>
        <Text style={[styles.heading, { maxWidth: 300 }]}>
          More meaningful connections.{'\n'}Less busywork.
        </Text>
        <Text style={[styles.eyebrow, { fontSize: 9 }]}>ONE BUSINESS. EVERY CELEBRATION.</Text>
      </LinearGradient>
      <Card>
        <Text style={styles.heading}>Secure owner sign-in</Text>
        <Text style={styles.muted}>
          Use your Indian mobile number to receive a verification code. New partners can register
          their business after signing in.
        </Text>
        {status.ready ? (
          sentTo ? (
            <>
              <Notice
                message={`We sent a six-digit code to ${sentTo}. Never share it with anyone.`}
              />
              <Field
                label="SMS verification code"
                placeholder="6-digit code"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                editable={!busy}
              />
              <Button
                title={verifiedToken.current ? 'Retry sign-in' : 'Verify and continue'}
                onPress={() => verify.mutate()}
                loading={verify.isPending}
                disabled={busy || (!verifiedToken.current && code.length !== 6)}
              />
              <Button
                title={seconds > 0 ? `Resend code in ${seconds}s` : 'Resend verification code'}
                variant="secondary"
                onPress={() => {
                  verify.reset();
                  send.mutate();
                }}
                disabled={busy || seconds > 0}
                loading={send.isPending}
              />
              <Button
                title="Use a different number"
                variant="secondary"
                onPress={changeNumber}
                disabled={busy}
              />
            </>
          ) : (
            <>
              <Field
                label="Mobile number"
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                autoCorrect={false}
                value={phone}
                onChangeText={setPhone}
                editable={!busy}
                maxLength={18}
              />
              <Button
                title="Send verification code"
                onPress={() => send.mutate()}
                loading={send.isPending}
                disabled={busy || !phone.trim() || seconds > 0}
              />
              {seconds > 0 ? (
                <Text style={styles.muted}>Wait {seconds}s before requesting another code.</Text>
              ) : null}
            </>
          )
        ) : (
          <Notice
            message={
              status.reason || 'Phone sign-in is unavailable at the moment. Please try again later.'
            }
          />
        )}
        {send.error ? <Notice tone="error" message={errorMessage(send.error)} /> : null}
        {verify.error ? <Notice tone="error" message={errorMessage(verify.error)} /> : null}
        {storageError ? <Notice tone="error" message={storageError} /> : null}
        {login.error ? <Notice tone="error" message={errorMessage(login.error)} /> : null}
      </Card>
      {DEV_AUTH ? (
        <Card style={{ borderColor: '#634F2F' }}>
          <Text style={styles.eyebrow}>DEVELOPMENT ENVIRONMENT</Text>
          <Text style={styles.muted}>
            Use the seeded development owner to exercise the real database workflow. This option
            must be disabled in release builds.
          </Text>
          <Button
            title="Open development owner workspace"
            icon="flask-outline"
            variant="secondary"
            onPress={() => login.mutate()}
            loading={login.isPending}
            disabled={busy}
          />
        </Card>
      ) : null}
      <Text style={[styles.muted, { fontSize: 12 }]}>
        VenueVista Partner · Andhra Pradesh & Telangana
      </Text>
    </Screen>
  );
}
