import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  )
  
  // Clear any cookies if you're using them
  response.cookies.delete('next-auth.session-token')
  
  return response
}