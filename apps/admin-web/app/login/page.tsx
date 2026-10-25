import LoginForm from '@/components/login-form';
import { developmentAuth } from '@/lib/server';

export const dynamic = 'force-dynamic';
export default function LoginPage() {
  const firebase = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
  return <LoginForm developmentEnabled={developmentAuth()} firebaseConfig={firebase} />;
}
