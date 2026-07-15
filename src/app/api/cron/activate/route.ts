import { NextResponse } from 'next/server';
import { db } from '@/firebase/admin';

// Vercel cron job endpoint (e.g. called every hour)
export async function GET(request: Request) {
  try {
    // Basic security check: if deployed on Vercel, we can verify the Cron secret
    // But for simplicity, we allow it, or you can add Authorization headers.
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Query all users with status = 'pending'
    const usersSnapshot = await db.collection('users').where('status', '==', 'pending').get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json({ success: true, activated: 0, message: 'No pending users found.' });
    }

    const now = new Date();
    let activatedCount = 0;

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      
      // If activationTime is set and has passed
      if (data.activationTime) {
        const activationTime = new Date(data.activationTime);
        if (now >= activationTime) {
          // Activate user
          await doc.ref.update({ status: 'active' });
          activatedCount++;

          // Send Welcome Email
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            await fetch(`${baseUrl}/api/email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: { email: data.email, name: data.fullName },
                type: 'welcome',
                data: {
                  name: data.fullName,
                  activationDate: now.toISOString()
                }
              })
            });
          } catch (emailErr) {
            console.error("Failed to send welcome email for user:", data.email, emailErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, activated: activatedCount });
  } catch (error: any) {
    console.error('Cron Activation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
