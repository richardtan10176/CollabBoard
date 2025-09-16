'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  DocumentTextIcon, 
  ArrowRightIcon,
  UserGroupIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGetStarted = () => {
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CollabBoard...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              <span className="ml-2 text-lg font-medium text-white">CollabBoard</span>
            </div>
            <button
              onClick={handleGetStarted}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-light text-white mb-8">
            Collaborate on
            <br />
            <span className="text-gray-400">Markdown</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light">
            Real-time collaborative markdown editor for teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center px-8 py-3 border border-gray-700 text-white hover:border-gray-600 hover:bg-gray-800 transition-colors font-medium"
            >
              Get Started
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center px-8 py-3 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-medium"
            >
              Learn More
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-4xl mx-auto px-6 py-24">
        {/* Feature 1: Real-time Collaboration */}
        <div className="flex items-start gap-6 mb-16">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserGroupIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white mb-3">Real-time Collaboration</h2>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              See your teammates' cursors and edits in real-time. No more version conflicts or lost changes. 
              Multiple users can work on the same document simultaneously with live updates and seamless
              synchronization.
            </p>
          </div>
        </div>

        {/* Feature 2: Live Cursor Tracking */}
        <div className="flex items-start gap-6 mb-16">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClockIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white mb-3">Live Cursor Tracking</h2>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              Watch where your team is working with live cursor positions and user indicators. 
              See exactly what your colleagues are editing to avoid stepping on each other's toes
            </p>
          </div>
        </div>

        {/* Feature 3: Version History */}
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white mb-3">Version History & Security</h2>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              Track every change with detailed version history and secure sharing. 
              Control who can view, edit, or own your content with granular permissions and never lose important edits.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
              <span className="ml-2 text-sm text-gray-500">CollabBoard</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}