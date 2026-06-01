import { signOut } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Sign out using the server-side signOut function
    await signOut({ redirect: false })
    
    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Sign out error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Sign out failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
