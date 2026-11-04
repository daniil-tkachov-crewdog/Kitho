import { Redirect } from 'expo-router'
import { useAuth } from '../lib/auth'
import { Spinner } from '../components/ui'

export default function Index() {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  return <Redirect href={session ? '/feed' : '/auth'} />
}
