import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, User, MessageCircle, Calculator, Database, AlertTriangle, Lock, BarChart3, Camera, Mail, Loader2, Trash2, Activity, Shield, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "./AuthModal";
import UserDataService from "@/services/UserDataService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiClient } from "@/utils/apiClient";
import { logger } from "@/utils/logger";

const Navigation = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'signup'>('login');
  const { isAuthenticated, user, logout, isDatabaseAvailable, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use useMemo to ensure stable reference for singleton
  const userDataService = useMemo(() => UserDataService.getInstance(), []);
  const hasLoadedProfileRef = useRef(false);

  const loadProfilePhoto = useCallback(async () => {
    try {
      const photoUrl = await userDataService.getProfilePhoto();
      setProfilePhoto(photoUrl);
    } catch (error) {
      logger.error('Failed to load profile photo:', error);
    }
  }, [userDataService]);

  const loadUserEmail = useCallback(async () => {
    try {
      // Check if user is authenticated and token exists before making request
      const token = localStorage.getItem('nutriai_token');
      if (!token || !isAuthenticated) {
        return;
      }
      
      const response = await apiClient.get('/auth/profile');
      if (response.success && response.data?.user) {
        setUserEmail(response.data.user.email || '');
      }
    } catch (error: any) {
      // Silently handle 401 errors (unauthorized) - user might not be logged in or token expired
      if (error?.status === 401 || error?.response?.status === 401) {
        // Token expired or invalid - clear state but don't log as error
        setUserEmail('');
        return;
      }
      // Only log non-401 errors
      logger.error('Failed to load user email:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !hasLoadedProfileRef.current) {
      hasLoadedProfileRef.current = true;
      loadProfilePhoto();
      loadUserEmail();
    } else if (!isAuthenticated) {
      hasLoadedProfileRef.current = false;
      setProfilePhoto(null);
      setUserEmail('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // loadProfilePhoto and loadUserEmail are stable callbacks

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - be more lenient, check extension if type is not available
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'jpe', 'gif', 'webp', 'bmp', 'svg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidType = file.type && (allowedTypes.includes(file.type) || file.type.startsWith('image/'));
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    if (!isValidType && !isValidExtension) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PNG, JPG, JPEG, GIF, or WEBP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const photoUrl = await userDataService.uploadProfilePhoto(file);
      if (photoUrl) {
        setProfilePhoto(photoUrl);
        toast({
          title: 'Photo Updated',
          description: 'Your profile photo has been successfully updated.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to upload photo. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to upload photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!profilePhoto) return;
    setIsRemovingPhoto(true);
    try {
      const success = await userDataService.deleteProfilePhoto();
      if (success) {
        setProfilePhoto(null);
        toast({
          title: 'Photo Removed',
          description: 'Your profile photo has been deleted.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to remove photo. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to delete photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openLoginModal = () => {
    setModalMode('login');
    setIsLoginModalOpen(true);
  };

  const openSignupModal = () => {
    setModalMode('signup');
    setIsSignupModalOpen(true);
  };

  const handleModeChange = (mode: 'login' | 'signup') => {
    setModalMode(mode);
    if (mode === 'login') {
      setIsSignupModalOpen(false);
      setIsLoginModalOpen(true);
    } else {
      setIsLoginModalOpen(false);
      setIsSignupModalOpen(true);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-lg sm:text-xl font-bold gradient-primary bg-clip-text text-transparent">
              NutriLens
            </span>
          </button>
          
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              About
            </button>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  const element = document.querySelector('#features');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  const element = document.querySelector('#how-it-works');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              How it Works
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal();
                  return;
                }
                navigate('/chat');
              }}
              className={`text-sm font-medium transition-colors flex items-center gap-1 hover:text-primary cursor-pointer ${
                location.pathname === '/chat' ? 'text-primary' : ''
              }`}
            >
              {!isAuthenticated ? (
                <Lock className="h-4 w-4" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              AI Chat
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal();
                  return;
                }
                navigate('/tracker');
              }}
              className={`text-sm font-medium transition-colors flex items-center gap-1 hover:text-primary cursor-pointer ${
                location.pathname === '/tracker' ? 'text-primary' : ''
              }`}
            >
              {!isAuthenticated ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Calorie Tracker
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal();
                  return;
                }
                navigate('/activity');
              }}
              className={`text-sm font-medium transition-colors flex items-center gap-1 hover:text-primary cursor-pointer ${
                location.pathname === '/activity' ? 'text-primary' : ''
              }`}
            >
              {!isAuthenticated ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Activity
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal();
                  return;
                }
                navigate('/reports');
              }}
              className={`text-sm font-medium transition-colors flex items-center gap-1 hover:text-primary cursor-pointer ${
                location.pathname === '/reports' ? 'text-primary' : ''
              }`}
            >
              {!isAuthenticated ? (
                <Lock className="h-4 w-4" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              Reports
            </button>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {!isDatabaseAvailable && (
              <div className="hidden sm:flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                <AlertTriangle className="h-3 w-3" />
                <span>DB Offline</span>
              </div>
            )}
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center space-x-2 text-sm hover:text-primary transition-colors cursor-pointer outline-none">
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt="Profile"
                            className="h-8 w-8 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <span className="font-medium">{user?.name}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-3">
                            {profilePhoto ? (
                              <img
                                src={profilePhoto}
                                alt="Profile"
                                className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-semibold">{user?.name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {userEmail || 'Loading...'}
                              </span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              id="profile-photo-upload"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={isUploadingPhoto}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {isUploadingPhoto ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Camera className="h-4 w-4 mr-2" />
                                  {profilePhoto ? 'Change Photo' : 'Upload Photo'}
                                </>
                              )}
                            </Button>
                            {profilePhoto && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 border border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isRemovingPhoto || isUploadingPhoto}
                                onClick={handleRemovePhoto}
                              >
                                {isRemovingPhoto ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Photo
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(isAdmin || user?.is_admin) && (
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={openLoginModal}>
                    Sign In
                  </Button>
                  <Button variant="hero" size="sm" onClick={openSignupModal}>
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Brain className="h-6 w-6 text-primary" />
                    <span className="text-lg font-bold gradient-primary bg-clip-text text-transparent">
                      NutriLens
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {!isDatabaseAvailable && (
                    <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <AlertTriangle className="h-3 w-3" />
                      <span>DB Offline</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Button
                      variant={location.pathname === '/' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/');
                        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                      }}
                    >
                      About
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/');
                        setTimeout(() => {
                          const element = document.querySelector('#features');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                    >
                      Features
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/');
                        setTimeout(() => {
                          const element = document.querySelector('#how-it-works');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                    >
                      How it Works
                    </Button>
                    <Button
                      variant={location.pathname === '/chat' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openLoginModal();
                          return;
                        }
                        navigate('/chat');
                      }}
                    >
                      {!isAuthenticated ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-2" />
                      )}
                      AI Chat
                    </Button>
                    <Button
                      variant={location.pathname === '/tracker' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openLoginModal();
                          return;
                        }
                        navigate('/tracker');
                      }}
                    >
                      {!isAuthenticated ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <Calculator className="h-4 w-4 mr-2" />
                      )}
                      Calorie Tracker
                    </Button>
                    <Button
                      variant={location.pathname === '/activity' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openLoginModal();
                          return;
                        }
                        navigate('/activity');
                      }}
                    >
                      {!isAuthenticated ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <Activity className="h-4 w-4 mr-2" />
                      )}
                      Activity
                    </Button>
                    <Button
                      variant={location.pathname === '/reports' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openLoginModal();
                          return;
                        }
                        navigate('/reports');
                      }}
                    >
                      {!isAuthenticated ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <BarChart3 className="h-4 w-4 mr-2" />
                      )}
                      Reports
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    {isAuthenticated ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                          {profilePhoto ? (
                            <img
                              src={profilePhoto}
                              alt="Profile"
                              className="h-10 w-10 rounded-full object-cover border-2 border-primary/20"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-sm truncate">{user?.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{userEmail || 'Loading...'}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => navigate('/profile')}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                        {(isAdmin || user?.is_admin) && (
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => navigate('/admin')}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Admin Panel
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive hover:text-destructive"
                          onClick={logout}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full" onClick={openLoginModal}>
                          Sign In
                        </Button>
                        <Button variant="hero" className="w-full" onClick={openSignupModal}>
                          Get Started
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="login"
        onModeChange={handleModeChange}
      />
      <AuthModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        mode="signup"
        onModeChange={handleModeChange}
      />
    </>
  );
};

export default Navigation;