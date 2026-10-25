import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../src/api';
import { useSession } from '../src/session';
import { Button, Card, Empty, ErrorState, Loading, Notice, Screen, styles } from '../src/ui';
interface Notification {
  id: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
  data?: { enquiryId?: string; venueId?: string };
}
export default function NotificationsScreen() {
  const { token, hydrated } = useSession();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notification[]>('/notifications'),
    enabled: Boolean(token),
  });
  const read = useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'PUT', body: {} }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  if (hydrated && !token) return <Redirect href="/sign-in" />;
  return (
    <Screen>
      <View style={{ gap: 7 }}>
        <Text style={styles.eyebrow}>YOUR BUSINESS, UP TO DATE</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.muted}>
          Enquiries, quotation updates, and listing reviews from your real VenueVista activity.
        </Text>
      </View>
      {read.error ? <Notice tone="error" message={errorMessage(read.error)} /> : null}
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <Empty
          icon="notifications-outline"
          title="All caught up"
          text="When there’s news about your listings or customer enquiries, we’ll keep it here."
        />
      ) : (
        query.data.map((n) => (
          <Card key={n.id}>
            <Text style={styles.heading}>{n.title}</Text>
            <Text style={styles.text}>{n.body}</Text>
            <Text style={styles.muted}>
              {new Date(n.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {n.data?.enquiryId ? (
                <Button
                  title="View enquiry"
                  variant="secondary"
                  onPress={() => {
                    read.mutate(n.id);
                    router.push({ pathname: '/enquiry', params: { id: n.data!.enquiryId! } });
                  }}
                />
              ) : n.data?.venueId ? (
                <Button
                  title="View venue"
                  variant="secondary"
                  onPress={() => {
                    read.mutate(n.id);
                    router.push({ pathname: '/venue/edit', params: { id: n.data!.venueId! } });
                  }}
                />
              ) : null}
              {!n.readAt ? (
                <Button
                  title="Mark read"
                  variant="secondary"
                  loading={read.isPending}
                  onPress={() => read.mutate(n.id)}
                />
              ) : (
                <Text style={styles.muted}>Read</Text>
              )}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
