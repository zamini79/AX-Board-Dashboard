-- 사용자가 자신의 알림을 삭제할 수 있도록 RLS 정책 추가
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());