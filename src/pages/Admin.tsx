import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  Trash2, 
  UserX, 
  UserCheck, 
  Search, 
  Loader2,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
  Eye,
  BarChart3,
  FileText,
  Activity,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/Footer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
}

interface AdminStats {
  total_users: number;
  verified_users: number;
  admin_users: number;
  recent_signups: number;
  total_meals_days?: number;
  total_food_logs: number;
  active_users?: number;
  avg_meals_per_user?: number;
  total_calories_logged?: number;
  total_exercises_logged?: number;
  total_calories_burned?: number;
  users_with_meals?: number;
  users_with_activity?: number;
  signups_by_day?: Record<string, number>;
  daily_activity_trend?: Record<string, {
    meals_logged: number;
    activity_logged: number;
    new_users: number;
  }>;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
  profile?: any;
  stats?: {
    total_meals_days: number;
    total_activity_days: number;
    total_goals_days: number;
    total_food_logs: number;
    days_since_first_activity: number;
    engagement_rate: number;
  };
  recent_meals?: Array<{
    date: string;
    meals_count: number;
    total_calories: number;
    meals: any[];
  }>;
  recent_activity?: Array<{
    date: string;
    exercises_count: number;
    water_intake: number;
    total_calories_burned: number;
  }>;
  current_goals?: any;
}

interface AdminLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  action: string;
  details: any;
  timestamp: string;
  ip_address?: string;
}

// Helper function to format action types into readable English
const formatActionType = (action: string): string => {
  const actionMap: Record<string, string> = {
    'toggle_admin': 'Toggle Admin Status',
    'delete_user': 'Delete User',
    'delete_history': 'Delete History',
    'bulk_delete': 'Bulk Delete Users',
    'bulk_verify': 'Bulk Verify Users',
    'bulk_unverify': 'Bulk Unverify Users',
    'bulk_promote': 'Bulk Promote to Admin',
    'bulk_demote': 'Bulk Remove Admin Status',
  };
  
  // If it's a bulk action, try to format it
  if (action.startsWith('bulk_')) {
    return actionMap[action] || action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  return actionMap[action] || action.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Helper function to format details into readable paragraph format
const formatDetails = (details: any): string => {
  if (!details || typeof details !== 'object') {
    return String(details);
  }
  
  const fieldMap: Record<string, string> = {
    'user_id': 'User ID',
    'user_email': 'User Email',
    'is_admin': 'Admin Status',
    'user_ids': 'User IDs',
    'results': 'Results',
  };
  
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(details)) {
    const formattedKey = fieldMap[key] || key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Format boolean values
    let formattedValue: string;
    if (typeof value === 'boolean') {
      formattedValue = value ? 'Yes' : 'No';
    } else if (Array.isArray(value)) {
      formattedValue = value.join(', ');
    } else {
      formattedValue = String(value);
    }
    
    parts.push(`${formattedKey}: ${formattedValue}`);
  }
  
  return parts.join(' • ');
};

const Admin = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showDeleteHistoryDialog, setShowDeleteHistoryDialog] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{id: string, email: string} | null>(null);
  const [deleteDate, setDeleteDate] = useState('');
  const [deleteCategory, setDeleteCategory] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiClient.getAdminStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllUsers(page, 20, searchTerm);
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.total_pages || 1);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, toast]);

  const loadUserDetails = useCallback(async (userId: string) => {
    setLoadingUserDetails(true);
    try {
      const response = await apiClient.getUserDetails(userId);
      if (response.success && response.data?.user) {
        setSelectedUserDetails(response.data.user);
        setShowUserDetails(true);
      } else {
        throw new Error('Failed to load user details');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load user details.',
        variant: 'destructive'
      });
    } finally {
      setLoadingUserDetails(false);
    }
  }, [toast]);

  const loadAdminLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await apiClient.getAdminLogs(logsPage, 50);
      if (response.success && response.data) {
        setAdminLogs(response.data.logs || []);
        setLogsTotalPages(response.data.total_pages || 1);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load admin logs.',
        variant: 'destructive'
      });
    } finally {
      setLoadingLogs(false);
    }
  }, [logsPage, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }
    loadStats();
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'logs') {
      loadAdminLogs();
    }
  }, [isAuthenticated, isAdmin, navigate, activeTab, loadStats, loadUsers, loadAdminLogs, toast]);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (actionLoading) return;
    
    setActionLoading(userId);
    try {
      const response = await apiClient.toggleAdminStatus(userId, !currentStatus);
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || `User ${!currentStatus ? 'promoted to' : 'demoted from'} admin.`
        });
        loadUsers();
        loadStats();
      } else {
        throw new Error(response.message || 'Failed to update admin status');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update admin status.',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will delete all their data permanently.`)) {
      return;
    }

    if (actionLoading) return;
    setActionLoading(userId);
    try {
      const response = await apiClient.deleteUser(userId);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'User and all associated data deleted successfully.'
        });
        loadUsers();
        loadStats();
        selectedUsers.delete(userId);
        setSelectedUsers(new Set(selectedUsers));
      } else {
        throw new Error(response.message || 'Failed to delete user');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user.',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkOperation = async (action: 'delete' | 'verify' | 'unverify' | 'promote' | 'demote') => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one user.',
        variant: 'destructive'
      });
      return;
    }

    const actionNames: Record<string, string> = {
      delete: 'delete',
      verify: 'verify email',
      unverify: 'unverify email',
      promote: 'promote to admin',
      demote: 'demote from admin'
    };

    if (!confirm(`Are you sure you want to ${actionNames[action]} ${selectedUsers.size} user(s)?`)) {
      return;
    }

    setActionLoading('bulk');
    try {
      const response = await apiClient.bulkUserOperation(Array.from(selectedUsers), action);
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || `Bulk operation completed successfully.`
        });
        loadUsers();
        loadStats();
        setSelectedUsers(new Set());
      } else {
        throw new Error(response.message || 'Failed to perform bulk operation');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk operation.',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteHistoryClick = (userId: string, userEmail: string) => {
    setSelectedUserForHistory({ id: userId, email: userEmail });
    setDeleteDate('');
    setDeleteCategory('all');
    setShowDeleteHistoryDialog(true);
  };

  const handleDeleteHistory = async () => {
    if (!selectedUserForHistory) return;

    const { id: userId, email } = selectedUserForHistory;
    const dateMsg = deleteDate ? ` on ${deleteDate}` : '';
    const categoryMsg = deleteCategory !== 'all' ? ` for category '${deleteCategory}'` : '';
    
    if (!confirm(`Are you sure you want to delete history${categoryMsg}${dateMsg} for ${email}? This will delete their data but keep their account.`)) {
      return;
    }

    if (actionLoading) return;
    setActionLoading(userId);
    try {
      const response = await apiClient.deleteUserHistory(
        userId,
        deleteDate || undefined,
        deleteCategory !== 'all' ? deleteCategory : undefined
      );
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'User history deleted successfully.'
        });
        loadUsers();
        loadStats();
        setShowDeleteHistoryDialog(false);
        setSelectedUserForHistory(null);
        setDeleteDate('');
        setDeleteCategory('all');
      } else {
        throw new Error(response.message || 'Failed to delete history');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete history.',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Manage users, view statistics, and control system access</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Activity Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Statistics Cards */}
              {stats && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="text-2xl">{stats.total_users}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Active Users</CardDescription>
                        <CardTitle className="text-2xl">{Math.min(stats.active_users || 0, stats.total_users || 0)}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Verified</CardDescription>
                        <CardTitle className="text-2xl">{stats.verified_users}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Admins</CardDescription>
                        <CardTitle className="text-2xl">{stats.admin_users}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Recent Signups</CardDescription>
                        <CardTitle className="text-2xl">{stats.recent_signups}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Meals Days</CardDescription>
                        <CardTitle className="text-2xl">{stats.total_meals_days || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Avg Meals/User</CardDescription>
                        <CardTitle className="text-2xl">{stats.avg_meals_per_user || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Calories</CardDescription>
                        <CardTitle className="text-2xl">{stats.total_calories_logged ? Math.round(stats.total_calories_logged / 1000) + 'k' : 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Exercises Logged</CardDescription>
                        <CardTitle className="text-2xl">{stats.total_exercises_logged || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                </>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">View and manage all users in the system</CardDescription>
                    </div>
                    {selectedUsers.size > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <MoreVertical className="h-4 w-4 mr-2" />
                            Bulk Actions ({selectedUsers.size})
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleBulkOperation('verify')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verify Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkOperation('unverify')}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Unverify Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkOperation('promote')}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Promote to Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkOperation('demote')}>
                            <UserX className="h-4 w-4 mr-2" />
                            Demote from Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkOperation('delete')} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Users
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setPage(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Users List */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <Checkbox
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <Label>Select All</Label>
                      </div>
                      <div className="space-y-2">
                        {users.map((userItem) => (
                          <div
                            key={userItem.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              checked={selectedUsers.has(userItem.id)}
                              onCheckedChange={() => toggleUserSelection(userItem.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 w-full">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-semibold text-sm sm:text-base">{userItem.name}</span>
                                {userItem.is_admin && (
                                  <Badge variant="default" className="bg-primary">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Admin
                                  </Badge>
                                )}
                                {userItem.email_verified ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Unverified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{userItem.email}</p>
                              {userItem.last_login && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last login: {new Date(userItem.last_login).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadUserDetails(userItem.id)}
                                disabled={loadingUserDetails}
                                className="text-xs sm:text-sm"
                              >
                                {loadingUserDetails && selectedUserDetails?.id === userItem.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAdmin(userItem.id, userItem.is_admin)}
                                disabled={actionLoading === userItem.id || userItem.id === user?.id}
                              >
                                {actionLoading === userItem.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : userItem.is_admin ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-1" />
                                    Demote
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Promote
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteHistoryClick(userItem.id, userItem.email)}
                                disabled={actionLoading === userItem.id}
                              >
                                {actionLoading === userItem.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Clear History
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(userItem.id, userItem.email)}
                                disabled={actionLoading === userItem.id || userItem.id === user?.id}
                              >
                                {actionLoading === userItem.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Activity Logs</CardTitle>
                  <CardDescription>Audit trail of all admin actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingLogs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : adminLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activity logs found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {adminLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{formatActionType(log.action)}</Badge>
                                  <span className="text-sm font-medium">{log.admin_name}</span>
                                  <span className="text-xs text-muted-foreground">({log.admin_email})</span>
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {formatDetails(log.details)}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(log.timestamp).toLocaleString()}
                                  {log.ip_address && ` • IP: ${log.ip_address}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {logsTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                            disabled={logsPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {logsPage} of {logsTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                            disabled={logsPage === logsTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              {selectedUserDetails?.email 
                ? `Complete profile and activity information for ${selectedUserDetails.email}`
                : 'View complete profile and activity information for this user'}
            </DialogDescription>
          </DialogHeader>
          {selectedUserDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium text-sm sm:text-base">{selectedUserDetails.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium text-sm sm:text-base break-words">{selectedUserDetails.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedUserDetails.is_admin && (
                      <Badge variant="default" className="text-xs">Admin</Badge>
                    )}
                    {selectedUserDetails.email_verified ? (
                      <Badge variant="outline" className="text-green-600 text-xs">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 text-xs">Unverified</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Member Since</Label>
                  <p className="font-medium text-sm sm:text-base">
                    {new Date(selectedUserDetails.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedUserDetails.stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Meal Days</Label>
                        <p className="text-xl sm:text-2xl font-bold">{selectedUserDetails.stats.total_meals_days}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Activity Days</Label>
                        <p className="text-xl sm:text-2xl font-bold">{selectedUserDetails.stats.total_activity_days}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Food Logs</Label>
                        <p className="text-xl sm:text-2xl font-bold">{selectedUserDetails.stats.total_food_logs}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Engagement Rate</Label>
                        <p className="text-xl sm:text-2xl font-bold">{selectedUserDetails.stats.engagement_rate}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Days Active</Label>
                        <p className="text-xl sm:text-2xl font-bold">{selectedUserDetails.stats.days_since_first_activity}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedUserDetails.recent_meals && selectedUserDetails.recent_meals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Meals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedUserDetails.recent_meals.slice(0, 5).map((day, idx) => (
                        <div key={idx} className="p-2 border rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{day.date}</span>
                            <span className="text-sm text-muted-foreground">
                              {day.meals_count} meals • {day.total_calories} cal
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedUserDetails.recent_activity && selectedUserDetails.recent_activity.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedUserDetails.recent_activity.slice(0, 5).map((day, idx) => (
                        <div key={idx} className="p-2 border rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{day.date}</span>
                            <span className="text-sm text-muted-foreground">
                              {day.exercises_count} exercises • {day.total_calories_burned} cal burned
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete History Dialog */}
      <Dialog open={showDeleteHistoryDialog} onOpenChange={setShowDeleteHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User History</DialogTitle>
            <DialogDescription>
              {selectedUserForHistory?.email 
                ? `Delete history for ${selectedUserForHistory.email}. You can filter by date and category.`
                : 'Delete user history. You can filter by date and category.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-date">Date (Optional)</Label>
              <Input
                id="delete-date"
                type="date"
                value={deleteDate}
                onChange={(e) => setDeleteDate(e.target.value)}
                placeholder="Leave empty to delete all dates"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to delete all dates, or select a specific date (YYYY-MM-DD)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-category">Category</Label>
              <Select value={deleteCategory} onValueChange={setDeleteCategory}>
                <SelectTrigger id="delete-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="meals">Meals Only</SelectItem>
                  <SelectItem value="activity">Activity Only</SelectItem>
                  <SelectItem value="goals">Goals Only</SelectItem>
                  <SelectItem value="food_logs">Food Logs Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which type of data to delete
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteHistoryDialog(false);
                setSelectedUserForHistory(null);
                setDeleteDate('');
                setDeleteCategory('all');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteHistory}
              disabled={actionLoading === selectedUserForHistory?.id}
            >
              {actionLoading === selectedUserForHistory?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete History
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Admin;
