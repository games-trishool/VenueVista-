import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { API_URL, mediaUri } from './api';
import { useSession } from './session';
import { colors } from './ui';

/** Private images use Bearer auth; browsers need an authenticated fetch before rendering a blob URL. */
export function AuthImage({
  url,
  label,
  style,
}: {
  url: string;
  label: string;
  style: StyleProp<ImageStyle>;
}) {
  const token = useSession((s) => s.token);
  const [blobUrl, setBlobUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const uri = mediaUri(url);
  const isApiMedia = new URL(uri).origin === new URL(API_URL).origin;
  const headers: Record<string, string> =
    token && isApiMedia ? { Authorization: `Bearer ${token}` } : {};
  useEffect(() => {
    setFailed(false);
    setBlobUrl(undefined);
    if (Platform.OS !== 'web') return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetch(uri, {
      headers: token && isApiMedia ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Image unavailable');
        return r.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, token, isApiMedia]);
  if (failed)
    return (
      <View
        style={[
          style,
          { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },
        ]}
      >
        <Text style={{ color: colors.muted, fontSize: 12 }}>Photo unavailable</Text>
      </View>
    );
  if (Platform.OS === 'web' && !blobUrl)
    return (
      <View
        style={[
          style,
          { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },
        ]}
      >
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  return (
    <Image
      accessibilityLabel={label}
      source={Platform.OS === 'web' ? { uri: blobUrl } : { uri, headers }}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
