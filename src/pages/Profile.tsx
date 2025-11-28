import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Save, Loader2, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserDataService, { UserProfile } from '@/services/UserDataService';
import { apiClient } from '@/utils/apiClient';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const userDataService = UserDataService.getInstance();
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: 0,
    weight: 0,
    height: 0,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintenance'
  });
  
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    email_verified: false
  });
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadUserInfo();
      loadProfilePhoto();
    }
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const profile = await userDataService.getUserProfile();
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      // Check if user is authenticated before making request
      const token = localStorage.getItem('nutriai_token');
      if (!token || !isAuthenticated) {
        return;
      }
      
      const response = await apiClient.get('/auth/profile');
      if (response.success && response.data?.user) {
        setUserInfo({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          email_verified: response.data.user.email_verified || false
        });
      }
    } catch (error: any) {
      // Silently handle 401 errors (unauthorized) - user might not be logged in or token expired
      if (error?.status === 401 || error?.response?.status === 401) {
        // Token expired or invalid - don't log as error
        return;
      }
      // Only log non-401 errors
      console.error('Failed to load user info:', error);
    }
  };

  const loadProfilePhoto = async () => {
    try {
      const photoUrl = await userDataService.getProfilePhoto();
      setProfilePhoto(photoUrl);
    } catch (error) {
      console.error('Failed to load profile photo:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
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
      console.error('Failed to upload photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
      // Reset input
      e.target.value = '';
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
      console.error('Failed to delete photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await userDataService.saveUserProfile(userProfile);
      if (success) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update profile. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Profile Management</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to access your profile.
            </p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your personal information and nutrition preferences
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6">
            {/* Profile Photo */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Profile Photo</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Upload your profile picture</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="relative">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-primary"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                      <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary/50" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingPhoto}
                      onClick={() => document.getElementById('photo-upload')?.click()}
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
                        type="button"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, GIF, or WEBP. Max 5MB
                  </p>
                </div>
              </div>
            </Card>

            {/* Account Information */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Account Information</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Your basic account details</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={userInfo.name}
                    disabled
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Name cannot be changed</p>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={userInfo.email}
                    disabled
                    className="mt-1"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {userInfo.email_verified ? (
                        <span className="text-green-600">✓ Email verified</span>
                      ) : (
                        <span className="text-amber-600">⚠ Email not verified</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Nutrition Profile */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Nutrition Profile</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Update your nutrition preferences and goals</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="120"
                    value={userProfile.age || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="Enter your age"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="1"
                    max="500"
                    step="0.1"
                    value={userProfile.weight || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="Enter your weight"
                  />
                </div>
                
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="50"
                    max="250"
                    value={userProfile.height || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="Enter your height"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={userProfile.gender}
                    onValueChange={(value) => setUserProfile(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger id="gender" className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="activityLevel">Activity Level</Label>
                  <Select
                    value={userProfile.activityLevel}
                    onValueChange={(value) => setUserProfile(prev => ({ ...prev, activityLevel: value }))}
                  >
                    <SelectTrigger id="activityLevel" className="mt-1">
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                      <SelectItem value="light">Light (exercise 1-3 days/week)</SelectItem>
                      <SelectItem value="moderate">Moderate (exercise 3-5 days/week)</SelectItem>
                      <SelectItem value="active">Active (exercise 6-7 days/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (hard exercise daily)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="goal">Goal</Label>
                  <Select
                    value={userProfile.goal}
                    onValueChange={(value) => setUserProfile(prev => ({ ...prev, goal: value }))}
                  >
                    <SelectTrigger id="goal" className="mt-1">
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="weight_gain">Weight Gain</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;

