'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar } from './ui/avatar'
import { Card } from './ui/card'
import { Label } from './ui/label'
import { Camera } from 'lucide-react'

export function UserProfile() {
  const [userDetails, setUserDetails] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('userProfile')
      return savedProfile ? JSON.parse(savedProfile) : {
        name: '',
        email: '',
        userId: '',
        photoUrl: ''
      }
    }
    return {
      name: '',
      email: '',
      userId: '',
      photoUrl: ''
    }
  });

  const [message, setMessage] = useState('');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        setUserDetails(prev => ({
          ...prev,
          photoUrl
        }));
        setMessage('Photo uploaded successfully!');
        setTimeout(() => setMessage(''), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Define the handleInputChange function
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = () => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(userDetails));
      setMessage('Changes Saved!');
      setTimeout(() => {
        setMessage('');
        // Close the sidebar or perform any additional actions
      }, 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  return (
    <div className="fixed left-16 top-0 h-full bg-background border-r w-80 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">User Profile</h2>
      
      <Card className="p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar
              className="w-24 h-24 rounded-full" // Ensure circular display
              src={userDetails.photoUrl || undefined} // Ensure src is set correctly
            />
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Camera size={16} className="text-white" />
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={userDetails.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={userDetails.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              name="userId"
              value={userDetails.userId}
              onChange={handleInputChange}
              placeholder="Enter your user ID"
            />
          </div>

          <Button 
            className="w-full" 
            type="button"
            onClick={handleSaveChanges}
          >
            Save Changes
          </Button>
          {message && <p className="text-green-500 mt-2">{message}</p>}
        </div>
      </Card>
    </div>
  );
}