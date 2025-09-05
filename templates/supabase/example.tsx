import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Database, CheckCircle, Circle, Edit, Trash2, Plus, AlertCircle, Copy, Activity, Users } from 'lucide-react';

// Define the Todo type
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

// Supabase client setup (works for both local dev and Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function SupabaseTodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Show configuration error if Supabase is not set up
  if (!supabase) {
    return (
      <main className="min-h-screen bg-black text-white">
        {/* Grid background pattern */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Content */}
        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-center p-6">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
              ← Back to Home
            </Link>
            <a href="https://twitter.com/0xcapx" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <svg width="40" height="14" viewBox="0 0 735 257" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M393.371 60.1076C428.418 39.3368 466.736 49.4457 488.168 73.7358C510.685 99.1 513.774 136.777 495.43 165.276C484.54 181.975 469.643 192.797 450.397 197.607C431.15 202.417 412.435 199.002 395.185 189.59V235.814C395.185 247.037 388.286 255.478 378.117 256.215C367.583 257.13 358.681 249.225 358.143 238.203C357.96 235.99 358.143 233.786 358.143 231.581V71.1384C358.042 68.2175 358.409 65.2993 359.228 62.4966C361.77 55.6906 366.49 51.4658 373.578 50.3596C380.295 49.0769 386.108 51.4658 390.829 56.6124C391.762 57.7109 392.612 58.8793 393.371 60.1076ZM395.367 124.071C394.282 141.355 408.626 162.495 433.138 162.495C453.842 162.679 470.736 145.396 470.918 124.256C470.918 102.932 454.206 85.6563 433.138 85.8406C409.354 86.025 394.456 106.427 395.367 124.071Z" fill="#E6E6E6"/>
                <path d="M284.264 64.3382C285.539 63.4244 285.539 62.318 285.896 61.3962C289.713 53.3075 297.704 49.0828 306.242 50.7342C310.287 51.4901 313.961 53.6097 316.664 56.748C319.368 59.8862 320.943 63.8584 321.132 68.0178V179.96C321.259 182.897 320.826 185.831 319.857 188.602C316.95 195.953 311.509 200.178 303.7 200.731C296.072 201.1 290.236 197.605 286.442 190.991C285.827 189.862 285.282 188.694 284.81 187.496C283.535 187.127 282.815 188.233 282.086 188.787C239.404 219.482 180.707 197.789 166.95 145.586C156.416 105.88 178.933 64.1538 217.069 52.4176C239.404 45.4272 260.629 48.9224 280.272 61.9733C281.718 62.5428 283.065 63.341 284.264 64.3382ZM201.632 125.737C201.608 129.27 202.036 132.792 202.907 136.214C209.624 162.869 240.497 174.26 261.564 157.722C280.454 143.012 282.268 114.521 265.524 97.4304C256.812 88.6122 246.097 84.5559 233.749 86.584C214.891 89.8868 201.814 106.064 201.632 125.737Z" fill="#E6E6E6"/>
                <path d="M594.467 93.1272C594.575 93.257 594.709 93.3614 594.861 93.433C595.013 93.5046 595.178 93.5417 595.346 93.5417C595.514 93.5417 595.679 93.5046 595.831 93.433C595.983 93.3614 596.117 93.257 596.225 93.1272C600.835 87.4355 605.437 81.9041 609.88 76.5571C615.511 69.751 620.968 62.929 626.591 56.155C631.676 50.2709 638.028 47.6976 645.655 49.7418C648.438 50.4709 651.012 51.8541 653.167 53.7789C655.322 55.7037 657 58.1159 658.061 60.8196C659.123 63.5234 659.54 66.4425 659.278 69.3399C659.016 72.2373 658.083 75.0313 656.554 77.495C655.2 79.5623 653.683 81.5142 652.015 83.331C641.846 95.8288 631.676 108.183 621.324 120.648C618.101 124.729 619.123 123.374 622.401 127.863L654.082 166.158C663.88 176.828 659.627 192.941 646.416 197.278C639.153 199.683 631.526 197.278 626.441 191.025C617.356 179.994 608.462 169.148 599.377 158.157C598.474 157.051 597.746 156.129 596.835 155.031C595.021 152.826 594.839 152.826 593.026 155.215C584.852 164.955 576.861 174.88 568.687 184.62C566.873 186.832 565.234 189.037 563.42 191.033C556.521 199.122 545.259 200.404 537.283 193.791C529.11 186.993 528.207 175.409 534.908 166.951C546.17 153.171 557.424 139.567 568.687 125.963C570.865 123.205 570.865 123.205 568.687 120.632C557.788 107.396 546.898 94.1774 536.001 81.1104C531.588 75.8035 529.213 70.1038 531.066 63.2897C531.804 60.0836 533.368 57.1326 535.6 54.7373C537.831 52.3419 540.649 50.5878 543.768 49.6534C546.887 48.719 550.194 48.6378 553.354 49.4179C556.514 50.1981 559.413 51.8118 561.757 54.0948C562.842 55.201 563.935 56.4997 565.02 57.7744C573.462 68.0996 590.412 88.3013 594.467 93.1272Z" fill="#8DBC1A"/>
                <path d="M79.6253 45.4856C99.4258 45.4856 116.494 52.2917 131.383 65.1581C139.739 72.5093 140.824 84.2695 133.759 92.1739C130.85 95.5177 126.849 97.6916 122.487 98.2994C118.125 98.9071 113.693 97.9081 109.999 95.4847C108.367 94.3783 107.092 93.0797 105.46 91.9895C86.3809 76.3653 56.7436 81.1431 43.303 101.738C28.4131 124.529 40.7607 155.961 67.6418 162.943C81.8033 166.623 94.6971 164.05 106.142 154.67C111.947 149.708 118.49 148.057 125.57 150.814C128.313 151.846 130.773 153.526 132.745 155.714C134.718 157.901 136.145 160.535 136.909 163.394C137.673 166.253 137.751 169.255 137.137 172.151C136.524 175.047 135.235 177.753 133.379 180.043C131.884 181.666 130.298 183.199 128.627 184.636C111.203 198.264 91.4024 204.301 69.4238 201.367C40.9112 197.359 19.6613 182.248 7.31376 155.961C-10.8472 117.177 5.1357 66.9779 52.7122 50.0791C61.3292 46.8913 70.4517 45.3343 79.6253 45.4856Z" fill="#E6E6E6"/>
                <rect x="675.089" y="3.13166" width="56.1296" height="56.9095" rx="27.877" stroke="#E6E6E6" strokeWidth="6.26869"/>
                <path d="M695.457 40.8973V21.3586H703.891C705.341 21.3586 706.61 21.6225 707.698 22.1504C708.785 22.6783 709.631 23.4384 710.235 24.4306C710.84 25.4228 711.142 26.6122 711.142 27.9987C711.142 29.398 710.83 30.5778 710.207 31.5382C709.59 32.4986 708.722 33.2237 707.602 33.7134C706.489 34.2031 705.188 34.448 703.7 34.448H698.663V30.3266H702.632C703.255 30.3266 703.786 30.2502 704.225 30.0976C704.67 29.9386 705.01 29.6874 705.246 29.3439C705.487 29.0004 705.608 28.552 705.608 27.9987C705.608 27.439 705.487 26.9842 705.246 26.6344C705.01 26.2782 704.67 26.0175 704.225 25.8521C703.786 25.6804 703.255 25.5945 702.632 25.5945H700.762V40.8973H695.457ZM706.906 31.9293L711.79 40.8973H706.028L701.258 31.9293H706.906Z" fill="#E6E6E6"/>
              </svg>
            </a>
          </div>

          {/* Hero Section */}
          <section className="px-6 py-16">
            <div className="mx-auto max-w-6xl text-center">
              <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  Ship Database Apps
                </span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
                Real-time database, authentication, and storage. Everything configured.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <Database className="mr-1 h-3 w-3" />
                  PostgreSQL
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <Activity className="mr-1 h-3 w-3" />
                  Real-time
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <Users className="mr-1 h-3 w-3" />
                  Multi-user
                </Badge>
              </div>
            </div>
          </section>

          {/* Configuration Alert */}
          <div className="px-6 pb-24">
            <div className="mx-auto max-w-4xl">
              <Alert variant="destructive" className="border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <strong>Configuration Required</strong> - Set up your Supabase environment variables:
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>1. Copy environment variables:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')}
                          className="h-6 px-2 text-xs border-zinc-700"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div>2. Add to your <code className="bg-red-950 px-1 rounded">.env.local</code> file</div>
                      <div>3. Get values from your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-200 underline">Supabase Dashboard</a></div>
                      <div>4. Restart your development server</div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-auto">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <p className="text-center text-sm text-zinc-400">
                Crafted with ❤️ at{' '}
                <a 
                  href="https://twitter.com/0xcapx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:text-zinc-300 transition-colors"
                >
                  Capx
                </a>
              </p>
            </div>
          </footer>
        </div>
      </main>
    );
  }

  // Fetch todos on mount and set up real-time subscription
  useEffect(() => {
    fetchTodos();
    
    // Set up real-time subscription
    const channel = supabase!
      .channel('todos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          handleRealTimeUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setIsRealTimeConnected(status === 'SUBSCRIBED');
      });

    // Cleanup subscription on unmount
    return () => {
      supabase!.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, []);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Handle real-time updates
  function handleRealTimeUpdate(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        setTodos(prev => {
          // Avoid duplicates if we already have this todo
          if (prev.some(todo => todo.id === newRecord.id)) return prev;
          return [newRecord, ...prev];
        });
        break;
      case 'UPDATE':
        setTodos(prev => prev.map(todo => 
          todo.id === newRecord.id ? newRecord : todo
        ));
        break;
      case 'DELETE':
        setTodos(prev => prev.filter(todo => todo.id !== oldRecord.id));
        break;
    }
  }

  // Fetch all todos from Supabase
  async function fetchTodos() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase!
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTodos(data || []);
    } catch (err: any) {
      setError(`Failed to fetch todos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Add a new todo
  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase!
        .from('todos')
        .insert([{ title: newTitle.trim(), completed: false }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Real-time will handle the update, but we can optimistically update for better UX
      if (data && !isRealTimeConnected) {
        setTodos(prev => [data, ...prev]);
      }
      setNewTitle('');
    } catch (err: any) {
      setError(`Failed to add todo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Toggle completed state
  async function handleToggleComplete(todo: Todo) {
    setError(null);
    try {
      const { error } = await supabase!
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', todo.id);
      
      if (error) throw error;
      
      // Real-time will handle the update, but optimistically update if not connected
      if (!isRealTimeConnected) {
        setTodos(prev => prev.map(t => 
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        ));
      }
    } catch (err: any) {
      setError(`Failed to update todo: ${err.message}`);
    }
  }

  // Start editing a todo title
  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  }

  // Cancel editing
  function cancelEditing() {
    setEditingId(null);
    setEditingTitle('');
  }

  // Save edited title
  async function saveEdit(todoId: number) {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }
    
    setError(null);
    try {
      const { error } = await supabase!
        .from('todos')
        .update({ title: editingTitle.trim() })
        .eq('id', todoId);
      
      if (error) throw error;
      
      // Real-time will handle the update, but optimistically update if not connected
      if (!isRealTimeConnected) {
        setTodos(prev => prev.map(t => 
          t.id === todoId ? { ...t, title: editingTitle.trim() } : t
        ));
      }
      cancelEditing();
    } catch (err: any) {
      setError(`Failed to update todo: ${err.message}`);
    }
  }

  // Handle edit form submission
  function handleEditSubmit(e: React.FormEvent, todoId: number) {
    e.preventDefault();
    saveEdit(todoId);
  }

  // Show delete confirmation
  function showDeleteConfirm(todoId: number) {
    setDeleteConfirmId(todoId);
  }

  // Cancel delete
  function cancelDelete() {
    setDeleteConfirmId(null);
  }

  // Delete a todo
  async function confirmDelete(todoId: number) {
    setError(null);
    try {
      const { error } = await supabase!
        .from('todos')
        .delete()
        .eq('id', todoId);
      
      if (error) throw error;
      
      // Real-time will handle the update, but optimistically update if not connected
      if (!isRealTimeConnected) {
        setTodos(prev => prev.filter(t => t.id !== todoId));
      }
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(`Failed to delete todo: ${err.message}`);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <a href="https://twitter.com/0xcapx" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <svg width="40" height="14" viewBox="0 0 735 257" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M393.371 60.1076C428.418 39.3368 466.736 49.4457 488.168 73.7358C510.685 99.1 513.774 136.777 495.43 165.276C484.54 181.975 469.643 192.797 450.397 197.607C431.15 202.417 412.435 199.002 395.185 189.59V235.814C395.185 247.037 388.286 255.478 378.117 256.215C367.583 257.13 358.681 249.225 358.143 238.203C357.96 235.99 358.143 233.786 358.143 231.581V71.1384C358.042 68.2175 358.409 65.2993 359.228 62.4966C361.77 55.6906 366.49 51.4658 373.578 50.3596C380.295 49.0769 386.108 51.4658 390.829 56.6124C391.762 57.7109 392.612 58.8793 393.371 60.1076ZM395.367 124.071C394.282 141.355 408.626 162.495 433.138 162.495C453.842 162.679 470.736 145.396 470.918 124.256C470.918 102.932 454.206 85.6563 433.138 85.8406C409.354 86.025 394.456 106.427 395.367 124.071Z" fill="#E6E6E6"/>
              <path d="M284.264 64.3382C285.539 63.4244 285.539 62.318 285.896 61.3962C289.713 53.3075 297.704 49.0828 306.242 50.7342C310.287 51.4901 313.961 53.6097 316.664 56.748C319.368 59.8862 320.943 63.8584 321.132 68.0178V179.96C321.259 182.897 320.826 185.831 319.857 188.602C316.95 195.953 311.509 200.178 303.7 200.731C296.072 201.1 290.236 197.605 286.442 190.991C285.827 189.862 285.282 188.694 284.81 187.496C283.535 187.127 282.815 188.233 282.086 188.787C239.404 219.482 180.707 197.789 166.95 145.586C156.416 105.88 178.933 64.1538 217.069 52.4176C239.404 45.4272 260.629 48.9224 280.272 61.9733C281.718 62.5428 283.065 63.341 284.264 64.3382ZM201.632 125.737C201.608 129.27 202.036 132.792 202.907 136.214C209.624 162.869 240.497 174.26 261.564 157.722C280.454 143.012 282.268 114.521 265.524 97.4304C256.812 88.6122 246.097 84.5559 233.749 86.584C214.891 89.8868 201.814 106.064 201.632 125.737Z" fill="#E6E6E6"/>
              <path d="M594.467 93.1272C594.575 93.257 594.709 93.3614 594.861 93.433C595.013 93.5046 595.178 93.5417 595.346 93.5417C595.514 93.5417 595.679 93.5046 595.831 93.433C595.983 93.3614 596.117 93.257 596.225 93.1272C600.835 87.4355 605.437 81.9041 609.88 76.5571C615.511 69.751 620.968 62.929 626.591 56.155C631.676 50.2709 638.028 47.6976 645.655 49.7418C648.438 50.4709 651.012 51.8541 653.167 53.7789C655.322 55.7037 657 58.1159 658.061 60.8196C659.123 63.5234 659.54 66.4425 659.278 69.3399C659.016 72.2373 658.083 75.0313 656.554 77.495C655.2 79.5623 653.683 81.5142 652.015 83.331C641.846 95.8288 631.676 108.183 621.324 120.648C618.101 124.729 619.123 123.374 622.401 127.863L654.082 166.158C663.88 176.828 659.627 192.941 646.416 197.278C639.153 199.683 631.526 197.278 626.441 191.025C617.356 179.994 608.462 169.148 599.377 158.157C598.474 157.051 597.746 156.129 596.835 155.031C595.021 152.826 594.839 152.826 593.026 155.215C584.852 164.955 576.861 174.88 568.687 184.62C566.873 186.832 565.234 189.037 563.42 191.033C556.521 199.122 545.259 200.404 537.283 193.791C529.11 186.993 528.207 175.409 534.908 166.951C546.17 153.171 557.424 139.567 568.687 125.963C570.865 123.205 570.865 123.205 568.687 120.632C557.788 107.396 546.898 94.1774 536.001 81.1104C531.588 75.8035 529.213 70.1038 531.066 63.2897C531.804 60.0836 533.368 57.1326 535.6 54.7373C537.831 52.3419 540.649 50.5878 543.768 49.6534C546.887 48.719 550.194 48.6378 553.354 49.4179C556.514 50.1981 559.413 51.8118 561.757 54.0948C562.842 55.201 563.935 56.4997 565.02 57.7744C573.462 68.0996 590.412 88.3013 594.467 93.1272Z" fill="#8DBC1A"/>
              <path d="M79.6253 45.4856C99.4258 45.4856 116.494 52.2917 131.383 65.1581C139.739 72.5093 140.824 84.2695 133.759 92.1739C130.85 95.5177 126.849 97.6916 122.487 98.2994C118.125 98.9071 113.693 97.9081 109.999 95.4847C108.367 94.3783 107.092 93.0797 105.46 91.9895C86.3809 76.3653 56.7436 81.1431 43.303 101.738C28.4131 124.529 40.7607 155.961 67.6418 162.943C81.8033 166.623 94.6971 164.05 106.142 154.67C111.947 149.708 118.49 148.057 125.57 150.814C128.313 151.846 130.773 153.526 132.745 155.714C134.718 157.901 136.145 160.535 136.909 163.394C137.673 166.253 137.751 169.255 137.137 172.151C136.524 175.047 135.235 177.753 133.379 180.043C131.884 181.666 130.298 183.199 128.627 184.636C111.203 198.264 91.4024 204.301 69.4238 201.367C40.9112 197.359 19.6613 182.248 7.31376 155.961C-10.8472 117.177 5.1357 66.9779 52.7122 50.0791C61.3292 46.8913 70.4517 45.3343 79.6253 45.4856Z" fill="#E6E6E6"/>
              <rect x="675.089" y="3.13166" width="56.1296" height="56.9095" rx="27.877" stroke="#E6E6E6" strokeWidth="6.26869"/>
              <path d="M695.457 40.8973V21.3586H703.891C705.341 21.3586 706.61 21.6225 707.698 22.1504C708.785 22.6783 709.631 23.4384 710.235 24.4306C710.84 25.4228 711.142 26.6122 711.142 27.9987C711.142 29.398 710.83 30.5778 710.207 31.5382C709.59 32.4986 708.722 33.2237 707.602 33.7134C706.489 34.2031 705.188 34.448 703.7 34.448H698.663V30.3266H702.632C703.255 30.3266 703.786 30.2502 704.225 30.0976C704.67 29.9386 705.01 29.6874 705.246 29.3439C705.487 29.0004 705.608 28.552 705.608 27.9987C705.608 27.439 705.487 26.9842 705.246 26.6344C705.01 26.2782 704.67 26.0175 704.225 25.8521C703.786 25.6804 703.255 25.5945 702.632 25.5945H700.762V40.8973H695.457ZM706.906 31.9293L711.79 40.8973H706.028L701.258 31.9293H706.906Z" fill="#E6E6E6"/>
            </svg>
          </a>
        </div>

        {/* Hero Section */}
        <section className="px-6 py-8 pb-4">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                Ship Database Apps
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
              Real-time todo app. PostgreSQL database. Everything connected.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Database className="mr-1 h-3 w-3" />
                PostgreSQL
              </Badge>
              <Badge 
                variant="outline" 
                className={`border-zinc-700 ${isRealTimeConnected ? 'text-green-400 border-green-700' : 'text-red-400 border-red-700'}`}
              >
                <Activity className="mr-1 h-3 w-3" />
                {isRealTimeConnected ? 'Live' : 'Offline'}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Users className="mr-1 h-3 w-3" />
                Multi-user
              </Badge>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="px-6 pb-24">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Tabs Container */}
            <Tabs defaultValue="todos" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-zinc-800">
                <TabsTrigger value="todos" className="data-[state=active]:bg-zinc-800">
                  Todo Manager
                </TabsTrigger>
                <TabsTrigger value="features" className="data-[state=active]:bg-zinc-800">
                  Features
                </TabsTrigger>
              </TabsList>

              {/* Todo Manager Tab */}
              <TabsContent value="todos" className="space-y-6">
                {/* Add Todo Form */}
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="font-heading text-xl flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add New Todo
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Create a new todo item in your database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddTodo} className="flex gap-4">
                      <Input
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        disabled={loading}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                      />
                      <Button 
                        type="submit" 
                        disabled={loading || !newTitle.trim()}
                        className="bg-white text-black hover:bg-zinc-200 min-w-[100px]"
                      >
                        {loading ? 'Adding...' : 'Add Todo'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Todos List */}
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-heading text-xl">Your Todos</CardTitle>
                        <CardDescription className="text-zinc-400">
                          {todos.length} {todos.length === 1 ? 'item' : 'items'} total
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${isRealTimeConnected ? 'border-green-700 text-green-400' : 'border-red-700 text-red-400'}`}
                      >
                        {isRealTimeConnected ? '🟢 Live' : '🔴 Offline'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && todos.length === 0 ? (
                      <div className="text-center py-8 text-zinc-400">
                        Loading todos...
                      </div>
                    ) : todos.length === 0 ? (
                      <div className="text-center py-12">
                        <Database className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300 mb-2">No todos yet</h3>
                        <p className="text-sm text-zinc-400 mb-4">Add your first todo above to get started!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {todos.map(todo => (
                          <div 
                            key={todo.id} 
                            className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                              todo.completed 
                                ? 'bg-zinc-800/30 border-zinc-800/50' 
                                : 'bg-zinc-800/50 border-zinc-700/50'
                            }`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleComplete(todo)}
                              disabled={loading}
                              className="p-0 h-auto hover:bg-transparent"
                            >
                              {todo.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-zinc-400 hover:text-white" />
                              )}
                            </Button>
                            
                            {editingId === todo.id ? (
                              <form 
                                onSubmit={(e) => handleEditSubmit(e, todo.id)}
                                className="flex-1 flex gap-2"
                              >
                                <Input
                                  ref={editInputRef}
                                  type="text"
                                  value={editingTitle}
                                  onChange={e => setEditingTitle(e.target.value)}
                                  className="bg-zinc-900 border-zinc-600 text-white"
                                  onBlur={() => saveEdit(todo.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') cancelEditing();
                                  }}
                                />
                                <Button 
                                  type="submit"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Save
                                </Button>
                                <Button 
                                  type="button"
                                  onClick={cancelEditing}
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-600"
                                >
                                  Cancel
                                </Button>
                              </form>
                            ) : (
                              <>
                                <span 
                                  className={`flex-1 cursor-pointer ${
                                    todo.completed 
                                      ? 'line-through text-zinc-500' 
                                      : 'text-zinc-200'
                                  }`}
                                  onDoubleClick={() => startEditing(todo)}
                                  title="Double-click to edit"
                                >
                                  {todo.title}
                                </span>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => startEditing(todo)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 hover:bg-zinc-700"
                                    title="Edit todo"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  
                                  {deleteConfirmId === todo.id ? (
                                    <div className="flex gap-1">
                                      <Button 
                                        onClick={() => confirmDelete(todo.id)}
                                        size="sm"
                                        className="h-8 px-2 bg-red-600 hover:bg-red-700"
                                      >
                                        Confirm
                                      </Button>
                                      <Button 
                                        onClick={cancelDelete}
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 border-zinc-600"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      onClick={() => showDeleteConfirm(todo.id)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 hover:bg-red-900/20 hover:text-red-400"
                                      title="Delete todo"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="font-heading text-xl">Features Demonstrated</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Complete CRUD operations with real-time updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Create</div>
                            <div className="text-sm text-zinc-400">Add new todos with form validation</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Read</div>
                            <div className="text-sm text-zinc-400">Fetch and display todos with loading states</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Update</div>
                            <div className="text-sm text-zinc-400">Toggle completion & inline title editing</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Delete</div>
                            <div className="text-sm text-zinc-400">Remove todos with confirmation dialog</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Real-time</div>
                            <div className="text-sm text-zinc-400">Live updates when data changes</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Error handling</div>
                            <div className="text-sm text-zinc-400">Comprehensive error messages and recovery</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">TypeScript</div>
                            <div className="text-sm text-zinc-400">Full type safety with interfaces</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-zinc-200">Multi-user</div>
                            <div className="text-sm text-zinc-400">Real-time collaboration support</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-6 bg-zinc-800" />
                    
                    <div className="space-y-4">
                      <h3 className="font-medium text-zinc-200">Database Schema</h3>
                      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                        <div className="text-sm text-zinc-300 font-mono">
                          <div className="text-zinc-500">-- Required table structure</div>
                          <div>CREATE TABLE todos (</div>
                          <div className="ml-4">id SERIAL PRIMARY KEY,</div>
                          <div className="ml-4">title TEXT NOT NULL,</div>
                          <div className="ml-4">completed BOOLEAN DEFAULT FALSE,</div>
                          <div className="ml-4">created_at TIMESTAMP DEFAULT NOW()</div>
                          <div>);</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-center text-sm text-zinc-400">
              Crafted with ❤️ at{' '}
              <a 
                href="https://twitter.com/0xcapx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-zinc-300 transition-colors"
              >
                Capx
              </a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
} 