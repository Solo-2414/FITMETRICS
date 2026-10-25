create unique index if not exists video_tutorials_video_url_key on public.video_tutorials (video_url);
create index if not exists video_tutorials_category_idx on public.video_tutorials (category);
alter table public.video_tutorials drop constraint if exists video_tutorials_difficulty_check;
alter table public.video_tutorials add constraint video_tutorials_difficulty_check check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced'));
