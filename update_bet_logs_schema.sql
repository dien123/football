-- ========================================================================
-- UPDATE SQL SCHEMA FOR BET LOGS & AUDIT TRAIL
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)
-- ========================================================================

-- 1. Thêm cột old_option và old_amount vào bảng bet_logs để lưu trạng thái trước khi thay đổi
ALTER TABLE public.bet_logs 
ADD COLUMN IF NOT EXISTS old_option TEXT,
ADD COLUMN IF NOT EXISTS old_amount NUMERIC;

-- 2. Cập nhật hàm trigger log_bet_changes để lưu cả giá trị cũ khi có UPDATE
CREATE OR REPLACE FUNCTION public.log_bet_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.bet_logs (match_id, bet_id, user_id, user_name, option, amount, action, old_option, old_amount)
    VALUES (
      NEW.match_id,
      NEW.id,
      NEW.user_id,
      NEW.user_name,
      NEW.option,
      NEW.amount,
      TG_OP,
      OLD.option,
      OLD.amount
    );
  ELSE
    INSERT INTO public.bet_logs (match_id, bet_id, user_id, user_name, option, amount, action, old_option, old_amount)
    VALUES (
      NEW.match_id,
      NEW.id,
      NEW.user_id,
      NEW.user_name,
      NEW.option,
      NEW.amount,
      TG_OP,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
