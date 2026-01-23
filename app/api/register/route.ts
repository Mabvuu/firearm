import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { email, password, role, national_id } = await req.json()

    if (!email || !password || !role || !national_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanNationalId = national_id.trim()

    // 1️⃣ NORMAL SIGNUP (THIS triggers email confirmation + shows in Users)
    const { data, error: signUpError } =
      await supabaseAnon.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { role }
        }
      })

    if (signUpError || !data.user) {
      return NextResponse.json(
        { error: signUpError?.message || 'Signup failed' },
        { status: 400 }
      )
    }

    const authUid = data.user.id

    // 2️⃣ INSERT PROFILE (DB enforces 1 email + 1 national_id per role)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        auth_uid: authUid,
        role,
        email: cleanEmail,
        national_id: cleanNationalId
      })

    if (profileError) {
      return NextResponse.json(
        { error: 'Email or National ID already exists for this role' },
        { status: 409 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
