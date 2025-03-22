import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import connectDB from '@/config/db'
import User from '@/models/User'

// Secret key for JWT (Use env variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development'

// Helper function to create consistent JSON responses with proper headers
const createResponse = (data: any, status: number) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return createResponse({}, 200)
}

export async function POST(request: Request) {
  // Ensure we always return JSON, even in case of errors
  try {
    // Connect to database with specific error handling
    try {
      console.log('Connecting to database...')
      await connectDB()
      console.log('Database connection successful')
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return createResponse({ message: 'Database connection failed' }, 500)
    }
    
    // Parse request body with specific error handling
    let userData
    try {
      userData = await request.json()
      console.log('Request body parsed successfully')
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return createResponse({ message: 'Invalid request format' }, 400)
    }
    
    const { email, password } = userData

    if (!email || !password) {
      return createResponse({ message: 'Email and password are required' }, 400)
    }

    // Find user in database with specific error handling
    let user
    try {
      user = await User.findOne({ email })
      console.log('User lookup completed')
      if (!user) {
        return createResponse({ message: 'User Not Found! Please register first.' }, 401)
      }
    } catch (findError) {
      console.error('Error finding user:', findError)
      return createResponse({ message: 'Error retrieving user information' }, 500)
    }

    // Verify password with specific error handling
    try {
      console.log('Comparing passwords...')
      const passwordMatch = await bcrypt.compare(password, user.password)
      console.log('Password comparison completed')
      if (!passwordMatch) {
        return createResponse({ message: 'Invalid credentials' }, 401)
      }
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError)
      return createResponse({ message: 'Authentication error' }, 500)
    }

    // Generate JWT Token with specific error handling
    let token
    try {
      console.log('Generating JWT token...')
      token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: '7d' // Token expires in 7 days
      })
      console.log('JWT token generated successfully')
    } catch (tokenError) {
      console.error('Token generation error:', tokenError)
      return createResponse({ message: 'Error creating authentication token' }, 500)
    }

    // Return success response
    return createResponse({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      token
    }, 200)
  } catch (error) {
    console.error('Login error:', error)
    return createResponse({ message: 'Internal server error' }, 500)
  }
}
