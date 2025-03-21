'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FcGoogle } from 'react-icons/fc'
import { signIn } from 'next-auth/react'

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // Validate form
      if (!username || !email || !password || !confirmPassword) {
        throw new Error('Please fill in all fields')
      }
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/auth?mode=login')
        }
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full p-6 rounded-md shadow-lg bg-black text-white border border-gray-800">
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        Create Account
      </h2>

      {error && (
        <div className="mb-6 rounded-md bg-red-900/30 border border-red-800 p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-300">
            Username
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
            className="bg-gray-950 text-white border-gray-800 focus:border-teal-500 h-10 rounded-md"
            disabled={loading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-gray-950 text-white border-gray-800 focus:border-teal-500 h-10 rounded-md"
            disabled={loading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-gray-950 text-white border-gray-800 focus:border-teal-500 h-10 rounded-md"
            disabled={loading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-gray-950 text-white border-gray-800 focus:border-teal-500 h-10 rounded-md"
            disabled={loading}
            required
          />
        </div>
        
        <Button
          type="submit"
          className="w-full h-10 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-medium rounded-md transition-all duration-200"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-3 bg-black text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-10 flex items-center justify-center gap-2 bg-gray-900 text-white border border-gray-800 hover:bg-gray-800 transition-all duration-200 rounded-md"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <FcGoogle size={20} />
        Google
      </Button>
    </div>
  )
}