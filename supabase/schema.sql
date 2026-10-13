-- Fôlego backend v1. Apply once to a dedicated Supabase project.
-- Auth users are managed by Supabase Auth. No secret key is required in the browser.
begin;

create function public.folego_text(v jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select coalesce(jsonb_typeof(v) = 'string' and length(btrim(v #>> '{}')) between 1 and 160, false)
$$;

create function public.folego_money(v jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(v) is distinct from 'number' then return false; end if;
  return abs((v #>> '{}')::numeric) <= 100000000000 and (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric);
exception when others then return false;
end;
$$;

create function public.folego_date(v jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare s text := v #>> '{}';
begin
  return coalesce(jsonb_typeof(v) = 'string' and s ~ '^\d{4}-\d{2}-\d{2}$' and to_char(s::date, 'YYYY-MM-DD') = s, false);
exception when others then return false;
end;
$$;

create function public.folego_valid_document(doc jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare collection text; item jsonb;
begin
  if jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text) > 2000000 then return false; end if;
  foreach collection in array array['accounts','entries','budgets','goals'] loop
    if jsonb_typeof(doc->collection) is distinct from 'array' or jsonb_array_length(doc->collection)>10000 then return false; end if;
    if (select count(*) from jsonb_array_elements(doc->collection)) <> (select count(distinct e->>'id') from jsonb_array_elements(doc->collection) e) then return false; end if;
    for item in select * from jsonb_array_elements(doc->collection) loop
      if not public.folego_text(item->'id') then return false; end if;
    end loop;
  end loop;
  for item in select * from jsonb_array_elements(doc->'accounts') loop
    if not public.folego_text(item->'name') or not public.folego_money(item->'opening') then return false; end if;
  end loop;
  for item in select * from jsonb_array_elements(doc->'entries') loop
    if not public.folego_text(item->'title') or not public.folego_text(item->'category') or not public.folego_money(item->'cents') or (item->>'cents')::numeric <= 0 or not public.folego_date(item->'date')
      or jsonb_typeof(item->'type') is distinct from 'string' or coalesce(item->>'type','') not in ('income','expense')
      or jsonb_typeof(item->'recurring') is distinct from 'boolean'
      or not exists(select 1 from jsonb_array_elements(doc->'accounts') a where a->>'id'=item->>'accountId') then return false; end if;
  end loop;
  for item in select * from jsonb_array_elements(doc->'budgets') loop
    if not public.folego_text(item->'category') or not public.folego_money(item->'limit') or (item->>'limit')::numeric <=0 then return false; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(doc->'budgets')) <> (select count(distinct lower(btrim(e->>'category'))) from jsonb_array_elements(doc->'budgets') e) then return false; end if;
  for item in select * from jsonb_array_elements(doc->'goals') loop
    if not public.folego_text(item->'name') or not public.folego_money(item->'target') or (item->>'target')::numeric<=0 or not public.folego_money(item->'saved') or (item->>'saved')::numeric<0 or not public.folego_date(item->'deadline') then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create table public.finance_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (public.folego_valid_document(data)),
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.finance_documents enable row level security;
create policy own_finance_select on public.finance_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy own_finance_insert on public.finance_documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_finance_update on public.finance_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_finance_delete on public.finance_documents for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.finance_documents from anon;
grant select, insert, update, delete on public.finance_documents to authenticated;

create function public.folego_revision_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    if new.revision <> 1 then raise exception 'Initial revision must be 1' using errcode='22023'; end if;
  elsif new.revision <> old.revision + 1 then
    raise exception 'Revision must increment by one' using errcode='40001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger finance_revision_guard before insert or update on public.finance_documents for each row execute function public.folego_revision_guard();

create function public.save_finance(document jsonb, expected_revision integer) returns integer
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := (select auth.uid()); result_revision integer;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if expected_revision < 0 or expected_revision is null or not public.folego_valid_document(document) then raise exception 'Invalid finance document' using errcode='22023'; end if;
  if expected_revision = 0 then
    insert into public.finance_documents(user_id,data,revision) values(owner_id,document,1)
    on conflict(user_id) do nothing returning revision into result_revision;
  else
    update public.finance_documents set data=document, revision=revision+1
    where user_id=owner_id and revision=expected_revision returning revision into result_revision;
  end if;
  if result_revision is null then raise exception 'Concurrent modification. Reload the server copy.' using errcode='40001'; end if;
  return result_revision;
end;
$$;
revoke all on function public.save_finance(jsonb,integer) from public,anon;
grant execute on function public.save_finance(jsonb,integer) to authenticated;
-- Helper functions validate values only; they never read user records.
revoke all on function public.folego_revision_guard() from public,anon,authenticated;
revoke all on function public.folego_text(jsonb), public.folego_money(jsonb), public.folego_date(jsonb), public.folego_valid_document(jsonb) from public,anon;
grant execute on function public.folego_text(jsonb), public.folego_money(jsonb), public.folego_date(jsonb), public.folego_valid_document(jsonb) to authenticated;
commit;
