alter table public.attendance
  alter column recorded_by drop not null;

create index if not exists attendance_member_open_idx
  on public.attendance(member_id, status, check_out_at);
