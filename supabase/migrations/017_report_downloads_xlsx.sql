do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.report_downloads'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%format%'
    and pg_get_constraintdef(oid) like '%csv%'
    and pg_get_constraintdef(oid) like '%pdf%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.report_downloads drop constraint %I', constraint_name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.report_downloads'::regclass
      and conname = 'report_downloads_format_check'
  ) then
    alter table public.report_downloads
      add constraint report_downloads_format_check
      check (format in ('csv', 'xlsx', 'pdf'));
  end if;
end $$;
