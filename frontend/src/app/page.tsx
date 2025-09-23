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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="mt-6 text-slate-300 text-lg font-light">Loading CollabBoard...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="backdrop-blur-md bg-slate-900/50 border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">CollabBoard</span>
            </div>
            <button
              onClick={handleGetStarted}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-200 font-medium backdrop-blur-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-32">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm font-medium mb-8">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              Real-time collaboration platform
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight">
            Collaborate on
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
              Markdown
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-16 max-w-3xl mx-auto font-light leading-relaxed">
            The most intuitive real-time collaborative markdown editor. 
            Write, edit, and share documents with your team seamlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started
              <ArrowRightIcon className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/20 hover:border-white/30 font-semibold text-lg backdrop-blur-sm transition-all duration-300"
            >
              Learn More
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Powerful Features
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Everything you need for seamless team collaboration
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12">
          {/* Feature 1: Real-time Collaboration */}
          <div className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <UserGroupIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Real-time Collaboration</h3>
            <p className="text-slate-300 leading-relaxed">
              See your teammates' cursors and edits in real-time. No more version conflicts or lost changes. 
              Multiple users can work on the same document simultaneously with live updates and seamless synchronization.
            </p>
          </div>

          {/* Feature 2: Live Cursor Tracking */}
          <div className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <ClockIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Live Cursor Tracking</h3>
            <p className="text-slate-300 leading-relaxed">
              Watch where your team is working with live cursor positions and user indicators. 
              See exactly what your colleagues are editing to avoid stepping on each other's toes.
            </p>
          </div>

          {/* Feature 3: Version History */}
          <div className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Version History & Security</h3>
            <p className="text-slate-300 leading-relaxed">
              Track every change with detailed version history and secure sharing. 
              Control who can view, edit, or own your content with granular permissions and never lose important edits.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-32">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <DocumentTextIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">CollabBoard</span>
            </div>
            <div className="flex items-center space-x-8">
              <p className="text-slate-400 text-sm">
                © 2024 CollabBoard. All rights reserved.
              </p>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-slate-400 text-sm">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}