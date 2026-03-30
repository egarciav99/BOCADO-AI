import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebaseConfig';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if email is already in use
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    
    if (signInMethods.length > 0) {
      // Email is already registered
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Email is available
    return NextResponse.json(
      { available: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking email:', error);
    
    // If the error is because the email format is invalid, return 400
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // For other errors, return 500
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
