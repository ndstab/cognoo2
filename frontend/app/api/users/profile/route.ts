import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/config/db'
import User from '@/models/User'

// Secret key for JWT (Use env variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development'

// Helper function to verify JWT token
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded as { id: string, email: string }
  } catch (error) {
    return null
  }
}

export const dynamic = 'force-dynamic';

// GET handler to fetch user profile
export async function GET(request: Request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return new Response(
        JSON.stringify({ message: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Connect to database
    await connectDB()
    
    // Find user by ID
    const user = await User.findById(decoded.id).select('-password')
    
    if (!user) {
      return new Response(
        JSON.stringify({ message: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return user data
    return new Response(
      JSON.stringify({ 
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// PUT handler to update user profile
export async function PUT(request: Request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return new Response(
        JSON.stringify({ message: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { username } = await request.json()
    
    if (!username) {
      return new Response(
        JSON.stringify({ message: 'Username is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Connect to database
    await connectDB()
    
    // Find and update user
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { username },
      { new: true, runValidators: true }
    ).select('-password')
    
    if (!user) {
      return new Response(
        JSON.stringify({ message: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return updated user data
    return new Response(
      JSON.stringify({ 
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating user profile:', error)
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const dynamic = 'force-dynamic';