import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const notifications: Array<{
      org_id: string
      user_id: string
      type: string
      title: string
      message: string
      payload: Record<string, unknown>
    }> = []

    // Fetch active tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, org_id, title, owner_id, status, due_date, last_checkin_at, updated_at')
      .in('status', ['not_started', 'in_progress', 'blocked', 'executive_review'])
      .not('owner_id', 'is', null)

    if (tasksError) throw tasksError

    // Fetch recent notifications for dedup (last 24h)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('type, payload')
      .gte('created_at', yesterday)

    const recentSet = new Set(
      (recentNotifs || []).map((n: any) => `${n.payload?.task_id}_${n.type}`)
    )

    const isDuplicate = (taskId: string, type: string) => recentSet.has(`${taskId}_${type}`)

    for (const task of tasks || []) {
      if (!task.owner_id) continue

      // 1. Deadline approaching (3 days / 1 day)
      if (task.due_date && task.status !== 'executive_review') {
        const dueDate = new Date(task.due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if ((daysUntilDue === 3 || daysUntilDue === 1) && !isDuplicate(task.id, 'deadline_approaching')) {
          notifications.push({
            org_id: task.org_id,
            user_id: task.owner_id,
            type: 'deadline_approaching',
            title: `마감 ${daysUntilDue}일 전`,
            message: `"${task.title}" 과제가 ${daysUntilDue}일 후 마감됩니다.`,
            payload: { task_id: task.id },
          })
        }
      }

      // 2. Missing check-in (7+ days, in_progress only)
      if (task.status === 'in_progress') {
        const lastCheckin = task.last_checkin_at ? new Date(task.last_checkin_at) : null
        const daysSinceCheckin = lastCheckin
          ? Math.floor((now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
          : 999

        if (daysSinceCheckin >= 7 && !isDuplicate(task.id, 'checkin_reminder')) {
          notifications.push({
            org_id: task.org_id,
            user_id: task.owner_id,
            type: 'checkin_reminder',
            title: '주간 체크인 미제출',
            message: `"${task.title}" 과제의 체크인이 ${daysSinceCheckin}일간 없습니다.`,
            payload: { task_id: task.id },
          })
        }
      }

      // 3. Long inactivity (14+ days no update)
      if (['not_started', 'in_progress'].includes(task.status)) {
        const lastUpdate = new Date(task.updated_at)
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceUpdate >= 14 && !isDuplicate(task.id, 'checkin_reminder')) {
          // Skip if already added checkin_reminder above
          const alreadyAdded = notifications.some(
            (n) => n.payload.task_id === task.id && n.type === 'checkin_reminder'
          )
          if (!alreadyAdded) {
            notifications.push({
              org_id: task.org_id,
              user_id: task.owner_id,
              type: 'checkin_reminder',
              title: '장기 미업데이트',
              message: `"${task.title}" 과제가 ${daysSinceUpdate}일간 변경되지 않았습니다.`,
              payload: { task_id: task.id },
            })
          }
        }
      }

      // 4. Pending approval (48+ hours)
      if (task.status === 'executive_review') {
        const updatedAt = new Date(task.updated_at)
        const hoursPending = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60))

        if (hoursPending >= 48 && !isDuplicate(task.id, 'approval_pending')) {
          notifications.push({
            org_id: task.org_id,
            user_id: task.owner_id,
            type: 'approval_pending',
            title: '승인 대기 중',
            message: `"${task.title}" 과제가 ${hoursPending}시간째 승인 대기 중입니다.`,
            payload: { task_id: task.id },
          })
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(notifications)
      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({ success: true, count: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
