
-- ============================================
-- 1. Enum 변경: 새 값 추가 + 데이터 마이그레이션 + 이전 값 제거
-- ============================================

-- 1a. 새 enum 값 추가
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
