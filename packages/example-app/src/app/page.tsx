import { useSession } from 'nextauth-simple';
import Link from 'next/link';

export default function Home() {
  const { session, user, status } = useSession();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">NextAuth-Simple Example</h1>
      
      {status === 'loading' ? (
        <p>Loading...</p>
      ) : status === 'authenticated' ? (
        <div>
          <p className="mb-2">Welcome, {user?.email}!</p>
          <p className="mb-4">You are authenticated.</p>
          
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Session Information</h2>
            <pre className="bg-gray-100 p-4 rounded">
              {JSON.stringify({ session, user }, null, 2)}
            </pre>
          </div>
          
          <Link 
            href="/api/auth/logout"
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </Link>
        </div>
      ) : (
        <div>
          <p className="mb-4">You are not authenticated.</p>
          <div className="flex gap-4">
            <Link 
              href="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Login
            </Link>
            <Link 
              href="/register"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
