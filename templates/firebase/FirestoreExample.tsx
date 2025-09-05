import React, { useState, useEffect } from 'react';
import {
  addDocument,
  getDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  subscribeToCollection,
  getCurrentUser,
  type FirestoreDocument,
  type Unsubscribe,
} from '../lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  Circle, 
  AlertCircle,
  Zap,
  Database,
  Calendar,
  Lock
} from 'lucide-react';

interface TodoItem extends FirestoreDocument {
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
  updatedAt: any;
  userId: string;
}

const FirestoreExample: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const currentUser = getCurrentUser();

  // Real-time subscription
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe | null = null;

    if (realtimeEnabled) {
      // Subscribe to real-time updates
      unsubscribe = subscribeToCollection(
        'todos',
        (documents) => {
          const userTodos = documents.filter((doc: any) => doc.userId === currentUser.uid);
          setTodos(userTodos as TodoItem[]);
          setLoading(false);
        },
        {
          whereConditions: [
            { field: 'userId', operator: '==', value: currentUser.uid }
          ],
          orderByField: 'createdAt',
          orderDirection: 'desc',
        }
      );
    } else {
      // Fetch data once
      fetchTodos();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, realtimeEnabled]);

  const fetchTodos = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const result = await getDocuments('todos', {
        whereConditions: [
          { field: 'userId', operator: '==', value: currentUser.uid }
        ],
        orderByField: 'createdAt',
        orderDirection: 'desc',
      });

      if (result.error) {
        setError(result.error);
      } else {
        setTodos(result.data as TodoItem[]);
      }
    } catch (err) {
      setError('Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be signed in to add todos');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const todoData = {
        ...formData,
        completed: false,
        userId: currentUser.uid,
      };

      const result = await addDocument('todos', todoData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Todo added successfully!');
        setFormData({ title: '', description: '', priority: 'medium' });
        if (!realtimeEnabled) {
          fetchTodos();
        }
      }
    } catch (err) {
      setError('Failed to add todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTodo = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditFormData({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
    });
  };

  const handleUpdateTodo = async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateDocument('todos', id, editFormData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Todo updated successfully!');
        setEditingId(null);
        if (!realtimeEnabled) {
          fetchTodos();
        }
      }
    } catch (err) {
      setError('Failed to update todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (todo: TodoItem) => {
    setIsSubmitting(true);
    try {
      const result = await updateDocument('todos', todo.id, {
        completed: !todo.completed,
      });
      if (result.error) {
        setError(result.error);
      } else {
        if (!realtimeEnabled) {
          fetchTodos();
        }
      }
    } catch (err) {
      setError('Failed to update todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteDocument('todos', id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Todo deleted successfully!');
        if (!realtimeEnabled) {
          fetchTodos();
        }
      }
    } catch (err) {
      setError('Failed to delete todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'outline'}>
        {priority}
      </Badge>
    );
  };

  if (!currentUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert className="border-zinc-800 bg-zinc-900/50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Please sign in to use Firestore features. Authentication is required for data isolation and security.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Firestore CRUD Operations
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your todos with real-time sync and user isolation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="realtime" className="text-sm text-zinc-400">Real-time</Label>
          <Switch
            id="realtime"
            checked={realtimeEnabled}
            onCheckedChange={setRealtimeEnabled}
          />
          <Badge variant={realtimeEnabled ? "default" : "secondary"} className="ml-2">
            <Zap className="mr-1 h-3 w-3" />
            {realtimeEnabled ? 'Live' : 'Manual'}
          </Badge>
        </div>
      </div>

      {/* Add Todo Form */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg">Add New Todo</CardTitle>
          <CardDescription className="text-zinc-400">
            Create a new task with priority level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter todo title"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-zinc-300">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter todo description"
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Todo
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Todos List */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg">Your Todos ({todos.length})</CardTitle>
          <CardDescription className="text-zinc-400">
            {realtimeEnabled ? 'Updates automatically' : 'Manual refresh mode'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-4" />
              <p className="text-zinc-400">Loading todos...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No todos found. Add your first todo above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todos.map((todo) => (
                <Card 
                  key={todo.id} 
                  className={`border-zinc-800 ${todo.completed ? 'opacity-60' : ''}`}
                >
                  {editingId === todo.id ? (
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            name="title"
                            value={editFormData.title}
                            onChange={handleEditInputChange}
                            placeholder="Title"
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                          <Select
                            value={editFormData.priority}
                            onValueChange={(value) => setEditFormData(prev => ({ 
                              ...prev, 
                              priority: value as 'low' | 'medium' | 'high' 
                            }))}
                          >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea
                          name="description"
                          value={editFormData.description}
                          onChange={handleEditInputChange}
                          placeholder="Description"
                          rows={2}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateTodo(todo.id)}
                            disabled={isSubmitting}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            size="sm"
                            variant="secondary"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${todo.completed ? 'line-through' : ''}`}>
                              {todo.title}
                            </h4>
                            {getPriorityBadge(todo.priority)}
                          </div>
                          {todo.description && (
                            <p className="text-sm text-zinc-400">{todo.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Created: {new Date(todo.createdAt?.seconds * 1000 || 0).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleToggleComplete(todo)}
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            className={todo.completed ? 'text-green-500' : 'text-zinc-400'}
                          >
                            {todo.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => handleEditTodo(todo)}
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTodo(todo.id)}
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Firestore Info */}
      <Alert className="border-zinc-800 bg-zinc-900/50">
        <Database className="h-4 w-4" />
        <AlertDescription className="text-zinc-300">
          <strong>Firestore Security:</strong> This demo uses user-specific data isolation. Each user can only access their own todos through security rules.
        </AlertDescription>
      </Alert>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive" className="border-red-800 bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-800 bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-200">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FirestoreExample;