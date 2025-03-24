import { NextResponse } from 'next/server'
import connectDB from '@/config/db'
import User from '@/models/User'
import jwt from 'jsonwebtoken'

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

export async function GET(req: Request) {
  try {
    await connectDB()
    
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      )
    }

    const users = await User.find({
      username: { $regex: username, $options: 'i' }
    })
    .select('_id username email')
    .limit(10)

    // Map the results to include id field
    const mappedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email
    }))

    return NextResponse.json({ users: mappedUsers })
  } catch (error: any) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search users' },
      { status: 500 }
    )
  }
}

