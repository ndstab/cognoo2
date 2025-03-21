import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json()
    
    // Here you would store the user in your database
    // For now, we'll just validate the input
    
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }
    
    // Simulate successful registration
    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: '1',
        username,
        email
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}