import { NextResponse } from 'next/server'
import connectDB from '@/config/db'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get the username query parameter
    const url = new URL(request.url)
    const username = url.searchParams.get('username')
    
    if (!username) {
      return new Response(
        JSON.stringify({ message: 'Username parameter is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Connect to database
    await connectDB()
    
    // Search for users with similar usernames (case insensitive)
    const users = await User.find({
      username: { $regex: username, $options: 'i' }
    })
    .select('_id username email')
    .limit(10)
    
    // Map the results to a safe format (exclude sensitive info)
    const safeUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email
    }))
    
    return new Response(
      JSON.stringify({ users: safeUsers }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error searching users:', error)
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: (error as Error).message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

