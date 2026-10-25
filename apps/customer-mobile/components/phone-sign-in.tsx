import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { request } from '../lib/api';
import { phoneAuthStatus, sendPhoneOtp, signOutPhoneAuth } from '../lib/phone-auth';
import type { PhoneChallenge } from '../lib/phone-auth.types';
import { useAppStore } from '../lib/store';
import type { User } from '../lib/types';
import { colors, ui } from '../lib/theme';
import { Button, FormField } from './ui';

function normalizePhone(value: string) {
  const phone = value.trim().replace(/[\s()-]/g, '');
  return /^[6-9]\d{9}$/.test(phone) ? `+91${phone}` : phone;
}

/** Exchanges a real Firebase phone proof for the backend's scoped application session. */
export function PhoneSignIn() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pending = useRef<PhoneChallenge | null>(null);
  const verifiedToken = useRef<string | null>(null);
  const mounted = useRef(true);
  const queryClient = useQueryClient();
  const setSession = useAppStore((s) => s.setSession);
  const notify = useAppStore((s) => s.notify);
  const status = phoneAuthStatus();
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.cancel();
      pending.current = null;
      verifiedToken.current = null;
      void signOutPhoneAuth().catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [resendAt]);

  async function send() {
    if (busy || remaining > 0) return;
    const normalized = normalizePhone(phone);
    if (!/^\+91[6-9]\d{9}$/.test(normalized)) {
      setError('Enter a valid Indian mobile number, such as +91 followed by ten digits.');
      return;
    }
    setBusy(true);
    setError('');
    pending.current?.cancel();
    pending.current = null;
    verifiedToken.current = null;
    try {
      const challenge = await sendPhoneOtp(normalized);
      if (!mounted.current) {
        challenge.cancel();
        return;
      }
      pending.current = challenge;
      setSentTo(normalized);
      setCode('');
      setResendAt(Date.now() + 60_000);
      setNow(Date.now());
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'We could not send a code. Please try again.',
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function verify() {
    if (busy || !pending.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code sent to your phone.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const idToken = verifiedToken.current ?? (await pending.current.confirm(code));
      verifiedToken.current = idToken;
      const session = await request<{ accessToken: string; user: User }>('/auth/firebase', {
        method: 'POST',
        body: { idToken },
      });
      if (!mounted.current) return;
      pending.current.cancel();
      pending.current = null;
      verifiedToken.current = null;
      queryClient.clear();
      await setSession(session.accessToken, session.user);
      notify('You’re signed in. Make room for something wonderful.');
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'We could not verify that code. Please try again.',
        );
    } finally {
      // Firebase is a proof-of-identity handoff; retain only the application session.
      await signOutPhoneAuth().catch(() => undefined);
      if (mounted.current) setBusy(false);
    }
  }

  function changeNumber() {
    if (busy) return;
    pending.current?.cancel();
    pending.current = null;
    verifiedToken.current = null;
    setSentTo('');
    setCode('');
    setError('');
    void signOutPhoneAuth().catch(() => undefined);
  }

  if (!status.ready)
    return (
      <Text style={{ color: colors.gold, fontSize: 12, lineHeight: 20 }}>{status.reason}</Text>
    );
  return (
    <View style={{ gap: 14 }}>
      {sentTo ? (
        <>
          <Text style={ui.body}>
            Enter the code sent to {sentTo}. Your phone number is verified securely before signing
            in.
          </Text>
          <FormField label="Verification code">
            <TextInput
              accessibilityLabel="Phone verification code"
              style={ui.input}
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={6}
              placeholder="Six-digit code"
              placeholderTextColor={colors.muted}
              editable={!busy}
            />
          </FormField>
          <Button
            label={verifiedToken.current ? 'Retry sign-in' : 'Verify code & sign in'}
            loading={busy}
            disabled={code.length !== 6}
            onPress={() => void verify()}
          />
          <Button
            label={remaining ? `Send a new code in ${remaining}s` : 'Send a new code'}
            secondary
            disabled={busy || remaining > 0}
            onPress={() => void send()}
          />
          <Button label="Use a different number" secondary disabled={busy} onPress={changeNumber} />
        </>
      ) : (
        <>
          <FormField label="Indian mobile number">
            <TextInput
              accessibilityLabel="Indian mobile number"
              style={ui.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoCorrect={false}
              placeholder="+91 mobile number"
              placeholderTextColor={colors.muted}
              editable={!busy}
              maxLength={16}
            />
          </FormField>
          <Button
            label="Send verification code"
            loading={busy}
            disabled={!phone.trim() || remaining > 0}
            onPress={() => void send()}
          />
          {remaining > 0 && (
            <Text style={[ui.body, { fontSize: 11 }]}>
              Wait {remaining}s before requesting another SMS.
            </Text>
          )}
          <Text style={[ui.body, { fontSize: 11 }]}>
            We’ll send an SMS to verify your number. Standard messaging rates may apply.
          </Text>
        </>
      )}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: 12, lineHeight: 19 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
