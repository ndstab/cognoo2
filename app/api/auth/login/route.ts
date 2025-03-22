import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import connectDB from '@/config/db'
import User from '@/models/User'

// Secret key for JWT (Use env variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

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
      return new Response(
        JSON.stringify({ message: 'Database connection failed' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Parse request body with specific error handling
    let userData
    try {
      userData = await request.json()
      console.log('Request body parsed successfully')
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ message: 'Invalid request format' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    const { email, password } = userData

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: 'Email and password are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Find user in database with specific error handling
    let user
    try {
      user = await User.findOne({ email })
      console.log('User lookup completed')
      if (!user) {
        return new Response(
          JSON.stringify({ message: 'User Not Found! Please register first.' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (findError) {
      console.error('Error finding user:', findError)
      return new Response(
        JSON.stringify({ message: 'Error retrieving user information' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify password with specific error handling
    try {
      console.log('Comparing passwords...')
      const passwordMatch = await bcrypt.compare(password, user.password)
      console.log('Password comparison completed')
      if (!passwordMatch) {
        return new Response(
          JSON.stringify({ message: 'Invalid credentials' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError)
      return new Response(
        JSON.stringify({ message: 'Authentication error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
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
      return new Response(
        JSON.stringify({ message: 'Error creating authentication token' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        token
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
