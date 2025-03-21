import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Mock database (Replace with real DB calls)
const usersDB = [
  { id: '1', email: 'test@example.com', password: 'password123' } // password: "password123"
]

// Secret key for JWT (Use env variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user in database (Replace with DB query)
    const user = usersDB.find((u) => u.email === email)
    if (!user) {
      return NextResponse.json(
        { message: 'User Not Found! Please register first.' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = (password === user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid credentialssss' },
        { status: 401 }
      )
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d' // Token expires in 7 days
    })

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
