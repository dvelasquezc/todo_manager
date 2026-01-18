import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to login if not authenticated, or to inbox if authenticated
  // For now, redirect to login
  redirect('/login')
}
