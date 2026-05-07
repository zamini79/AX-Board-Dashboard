import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface UserInput {
  email: string
  full_name: string
  role: 'admin' | 'ceo' | 'owner' | 'editor'
  title?: string
  department?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: '서버 설정 오류: 필수 환경변수 누락' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is authenticated and is manager
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check caller is cos_pmo or above (includes admin)
    const { data: callerRole } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['executive', 'cos_pmo', 'admin'])
      .maybeSingle()

    if (!callerRole) {
      return new Response(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get caller's org_id
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('org_id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.org_id) {
      return new Response(JSON.stringify({ error: '조직 정보를 찾을 수 없습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orgId = callerProfile.org_id

    const { users } = await req.json() as { users: UserInput[] }
    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: '사용자 목록이 비어있습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (users.length > 100) {
      return new Response(JSON.stringify({ error: '한 번에 최대 100명까지 등록 가능합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const results: { email: string; success: boolean; error?: string }[] = []

    for (const user of users) {
      try {
        // Validate
        if (!user.email || !user.full_name || !user.role) {
          results.push({ email: user.email || '(없음)', success: false, error: '필수 항목 누락 (이름, 이메일, 역할)' })
          continue
        }

        const validRoles = ['admin', 'ceo', 'owner', 'editor']
        if (!validRoles.includes(user.role)) {
          results.push({ email: user.email, success: false, error: '유효하지 않은 역할' })
          continue
        }

        // Generate temp password
        const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!'

        // Create auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: user.full_name },
        })

        if (createError) {
          results.push({ email: user.email, success: false, error: createError.message })
          continue
        }

        const userId = newUser.user.id

        // Update profile with title, department, and approval
        const { error: profileError } = await adminClient
          .from('profiles')
          .update({
            is_approved: true,
            org_id: orgId,
            full_name: user.full_name,
            title: user.title || null,
            department: user.department || null,
          })
          .eq('id', userId)

        if (profileError) {
          results.push({ email: user.email, success: false, error: `프로필 업데이트 실패: ${profileError.message}` })
          continue
        }

        // Assign role
        const { error: roleError } = await adminClient
          .from('user_roles')
          .insert({
            user_id: userId,
            org_id: orgId,
            role: user.role,
          })

        if (roleError) {
          results.push({ email: user.email, success: false, error: `역할 부여 실패: ${roleError.message}` })
          continue
        }

        results.push({ email: user.email, success: true })
      } catch (err) {
        results.push({ email: user.email || '(없음)', success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(JSON.stringify({ results, successCount, failCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
