-- SQL SCRIPT TO FIX "BET THỦ THUA ĐỦ" REFUND DATA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

-- 1. Xóa lượt hoàn bị sai (50.000) được tạo nhầm trước đó
DELETE FROM public.refunds 
WHERE id = '84a39e33-37ac-4161-bfe3-3624cc42df9d';

-- 2. Cập nhật thời gian hoàn của lượt 100.000 gốc sang 11:30 ngày 15/06/2026 (sau trận Thụy Điển vs Tunisia)
UPDATE public.refunds 
SET refunded_at = '2026-06-15T04:30:00.000Z' 
WHERE id = 'a8d52516-7a42-426d-932c-0749277868a4';

-- 3. Kiểm tra lại dữ liệu sau khi sửa đổi
SELECT * FROM public.refunds WHERE user_name = 'Bet Thủ Thua Đủ';
