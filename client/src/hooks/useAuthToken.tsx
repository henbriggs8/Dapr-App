import { useAuth } from '@clerk/clerk-react';

export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!isSignedIn) {
      return {};
    }

    try {
      const token = await getToken();
      if (!token) {
        return {};
      }

      return {
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return {};
    }
  };

  return { getAuthHeaders, isSignedIn };
}
