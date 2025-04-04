'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FcGoogle } from 'react-icons/fc'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields')
      }

      console.log('Attempting to sign in with credentials...')
      
      // Make a direct API call to validate credentials and get token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await loginResponse.json()
      
      // If credentials are invalid, throw error
      if (!loginResponse.ok) {
        console.error('Login API error:', data.message)
        throw new Error(data.message || 'Invalid credentials')
      }
      
      console.log('Login API response:', data)
      
      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token)
        console.log('Token stored in localStorage')
      } else {
        throw new Error('No authentication token received')
      }
      
      // Store full user object with all data
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        console.log('User data stored in localStorage')
      } else {
        throw new Error('No user data received')
      }
      
      // Sign in with NextAuth (for session management)
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      
      console.log('NextAuth sign in result:', result)
      
      if (result?.ok) {
        // Use router.replace instead of push to prevent history stacking
        console.log('Login successful, navigating to homepage...')
        router.replace('/')
      } else {
        // This should not happen if the API login was successful
        console.error('NextAuth login failed after API login success')
        throw new Error('Session creation failed')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
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
      console.error('Google login error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full p-6 rounded-md shadow-lg bg-black text-white border border-gray-800">
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        Welcome Back
      </h2>

      {error && (
        <div className="mb-6 rounded-md bg-red-900/30 border border-red-800 p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <a href="#" className="text-xs text-teal-400 hover:text-teal-300">
              Forgot password?
            </a>
          </div>
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

        <Button
          type="submit"
          className="w-full h-10 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-medium rounded-md transition-all duration-200"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
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
