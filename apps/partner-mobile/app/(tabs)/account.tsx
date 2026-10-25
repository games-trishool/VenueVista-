import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { api, DEV_AUTH, errorMessage } from '../../src/api';
import { useSession } from '../../src/session';
import type { Organization, User } from '../../src/types';
import {
  Badge,
  Button,
  Card,
  colors,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  styles,
} from '../../src/ui';
const schema = z.object({
  name: z.string().trim().min(2, 'Enter your registered business name.').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number (+91 optional).'),
  address: z.string().trim().min(8, 'Enter your business address.').max(500),
});
type Values = z.infer<typeof schema>;
export default function AccountScreen() {
  const { user, signIn, signOut } = useSession();
  const client = useQueryClient();
  const [logoutError, setLogoutError] = useState('');
  const [deleteText, setDeleteText] = useState('');
  const removeAccount = useMutation({
    mutationFn: () => api<{ deleted: boolean; retained: string }>('/me', { method: 'DELETE' }),
    onSuccess: async () => {
      await signOut();
      client.clear();
    },
  });
  const orgs = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api<Organization[]>('/organizations'),
  });
  const { control, handleSubmit, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', address: '' },
  });
  const create = useMutation({
    mutationFn: (body: Values) => api<Organization>('/organizations', { method: 'POST', body }),
    onSuccess: async (organization) => {
      reset();
      if (organization.session) await signIn(organization.session);
      const freshUser = await api<User>('/me');
      const currentToken = useSession.getState().token;
      if (currentToken) await signIn({ accessToken: currentToken, user: freshUser });
      void client.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text style={styles.eyebrow}>BUSINESS & ACCOUNT</Text>
        <Text style={styles.title}>A strong foundation.</Text>
        <Text style={styles.muted}>Manage the business behind your beautiful spaces.</Text>
      </View>
      <Card>
        <View style={styles.row}>
          <View style={{ backgroundColor: '#332548', padding: 15, borderRadius: 16 }}>
            <Ionicons name="person-outline" color={colors.gold} size={24} />
          </View>
          <View>
            <Text style={styles.heading}>{user?.displayName || 'Venue owner'}</Text>
            <Text style={styles.muted}>
              {user?.role === 'OWNER' ? 'Owner account' : 'Complete business registration'} · Secure
              session
            </Text>
          </View>
        </View>
        {DEV_AUTH ? (
          <Notice message="Development sign-in is enabled for this build. Disable it before distributing the app." />
        ) : null}
      </Card>
      <Text style={styles.heading}>Your organizations</Text>
      {orgs.isLoading ? (
        <Loading />
      ) : orgs.error ? (
        <ErrorState error={orgs.error} retry={() => void orgs.refetch()} />
      ) : orgs.data?.length ? (
        orgs.data.map((o) => (
          <Card key={o.id}>
            <View style={styles.row}>
              <Ionicons name="business-outline" color={colors.purple} size={23} />
              <Text style={styles.heading}>{o.name}</Text>
            </View>
            {o.status ? <Badge status={o.status} /> : null}
            {o.reviewReason ? <Notice message={o.reviewReason} /> : null}
            {o.address ? <Text style={styles.muted}>{o.address}</Text> : null}
            {o.phone ? <Text style={styles.muted}>{o.phone}</Text> : null}
          </Card>
        ))
      ) : (
        <Notice message="Create your first organization below before adding a venue." />
      )}
      <Card>
        <Text style={styles.heading}>Register a business</Text>
        <Text style={styles.muted}>
          One owner can manage multiple organizations and venues. Your details are stored securely
          in the backend.
        </Text>
        {(['name', 'phone', 'address'] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <Field
                label={
                  name === 'name'
                    ? 'Business name'
                    : name === 'phone'
                      ? 'Business mobile number'
                      : 'Registered business address'
                }
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType={name === 'phone' ? 'phone-pad' : 'default'}
                multiline={name === 'address'}
                error={error?.message}
              />
            )}
          />
        ))}
        <Button
          title="Create organization"
          icon="add-circle-outline"
          loading={create.isPending}
          onPress={handleSubmit((values) => create.mutate(values))}
        />
        {create.error ? <Notice tone="error" message={errorMessage(create.error)} /> : null}
        {create.isSuccess ? (
          <Notice tone="success" message="Organization created. You can now add a venue to it." />
        ) : null}
      </Card>
      <Card>
        <Text style={styles.heading}>Your session</Text>
        <Text style={styles.muted}>
          Sign out on shared devices. Venue photos and business data remain in your account.
        </Text>
        <Button
          title="Sign out"
          variant="secondary"
          icon="log-out-outline"
          onPress={() => {
            void signOut()
              .then(() => client.clear())
              .catch((e) => setLogoutError(errorMessage(e)));
          }}
        />
        {logoutError ? <Notice tone="error" message={logoutError} /> : null}
      </Card>
      <Card>
        <Text style={styles.heading}>Account deletion</Text>
        <Text style={styles.muted}>
          Deleting your platform account hides your venue listings, removes your profile and
          wishlist, and ends this session. Future confirmed bookings must be resolved first.
          Enquiry, booking, and audit records are retained according to the platform retention
          policy. Firebase identity removal still requires the configured identity service.
        </Text>
        <Field
          label="Type DELETE to confirm"
          value={deleteText}
          onChangeText={setDeleteText}
          autoCapitalize="characters"
        />
        <Button
          title="Delete platform account"
          variant="danger"
          disabled={deleteText !== 'DELETE'}
          loading={removeAccount.isPending}
          onPress={() => removeAccount.mutate()}
        />
        {removeAccount.error ? (
          <Notice tone="error" message={errorMessage(removeAccount.error)} />
        ) : null}
      </Card>
    </Screen>
  );
}
