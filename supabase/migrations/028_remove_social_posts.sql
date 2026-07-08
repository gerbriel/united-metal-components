-- Remove the Social Post Scheduler feature entirely.
-- The table was never wired to any real publishing integration; dropping it
-- also removes the dependent RLS policy "social_posts_staff_only" (from 003).

drop table if exists public.social_posts cascade;
drop type if exists public.post_status;
