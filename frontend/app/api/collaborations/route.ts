import { NextResponse } from 'next/server'
import connectDB from '@/config/db'
import Collaboration from '@/models/Collaboration'
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

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
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

    const body = await req.json()
    const { name, members } = body

    if (!name || !members || !Array.isArray(members)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Check if user is trying to add themselves
    if (members.includes(decoded.id)) {
      return NextResponse.json(
        { error: 'You cannot add yourself to a collaboration' },
        { status: 400 }
      )
    }

    // Create new collaboration with creator as first member
    const collaboration = await Collaboration.create({
      name,
      creator: decoded.id,
      members: [decoded.id, ...members]
    })

    // Populate the creator and members fields
    await collaboration.populate([
      { path: 'creator', select: 'username email' },
      { path: 'members', select: 'username email' }
    ])

    return NextResponse.json(collaboration)
  } catch (error: any) {
    console.error('Error creating collaboration:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create collaboration' },
      { status: 500 }
    )
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

    // Find all collaborations where the user is a member
    const collaborations = await Collaboration.find({
      members: decoded.id
    })
    .populate('creator', 'username email')
    .populate('members', 'username email')
    .populate('lastMessage.sender', 'username')
    .sort({ updatedAt: -1 })

    return NextResponse.json(collaborations)
  } catch (error: any) {
    console.error('Error fetching collaborations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch collaborations' },
      { status: 500 }
    )
  }
} 