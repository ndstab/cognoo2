import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/config/db'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Connect to database
    console.log('Connecting to database...')
    try {
      await connectDB()
      console.log('Database connection successful')
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return NextResponse.json(
        { message: 'Database connection failed' },
        { status: 500 }
      )
    }
    
    // Parse request body
    let userData
    try {
      userData = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { message: 'Invalid request format' },
        { status: 400 }
      )
    }
    
    const { username, email, password } = userData
    
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return NextResponse.json(
          { message: 'User with this email already exists' },
          { status: 400 }
        )
      }
    } catch (findError) {
      console.error('Error checking existing user:', findError)
      return NextResponse.json(
        { message: 'Error checking user existence' },
        { status: 500 }
      )
    }
    
    // Hash password
    let hashedPassword
    try {
      const salt = await bcrypt.genSalt(10)
      hashedPassword = await bcrypt.hash(password, salt)
    } catch (hashError) {
      console.error('Password hashing error:', hashError)
      return NextResponse.json(
        { message: 'Error processing password' },
        { status: 500 }
      )
    }
    
    // Create new user
    try {
      const user = new User({
        username,
        email,
        password: hashedPassword
      })
      
      await user.save()
      
      return NextResponse.json({
        message: 'Registration successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      })
    } catch (saveError) {
      console.error('Error saving user:', saveError)
      return NextResponse.json(
        { message: 'Error creating user account' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}