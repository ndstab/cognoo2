'use client'

import { useState, useEffect } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { BackgroundAnimation } from '@/components/background-animation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  
  // Add Poppins font
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return (
    <>
      <BackgroundAnimation />
      <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="w-full max-w-md rounded-lg bg-black text-white p-8 shadow-lg border border-gray-800">
          <h1 className="mb-6 text-center text-2xl font-bold text-transparent bg-clip-text bg-gray-300">Cogni</h1>
          
          <div className="mb-6 flex border-b border-gray-700">
            <button
              className={`flex-1 border-b-2 pb-2 font-medium ${isLogin ? 'bg-text-gray' : 'border-transparent text-gray-400'}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 border-b-2 pb-2 font-medium ${!isLogin ? 'bg-text-white' : 'border-transparent text-gray-400'}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>
          
          {isLogin ? (
            <LoginForm />
          ) : (
            <RegisterForm onSuccess={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </>
  )
}