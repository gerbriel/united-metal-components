-- Receiving documents — scanned load sheets / material receipts attached when
-- logging incoming coils and tube bundles from the Receiving screen.

-- Private bucket: these are internal sourcing artifacts, staff-only (they sit
-- alongside vendor/PO info, which customers never see).
insert into storage.buckets (id, name, public)
values ('receiving-docs', 'receiving-docs', false)
on conflict (id) do nothing;

-- Only staff (warehouse / office / admin) may read or manage receiving docs.
drop policy if exists "Staff read receiving docs" on storage.objects;
create policy "Staff read receiving docs" on storage.objects
  for select to authenticated
  using (bucket_id = 'receiving-docs' and public.is_staff());

drop policy if exists "Staff upload receiving docs" on storage.objects;
create policy "Staff upload receiving docs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receiving-docs' and public.is_staff());

drop policy if exists "Staff delete receiving docs" on storage.objects;
create policy "Staff delete receiving docs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receiving-docs' and public.is_staff());

-- Store the uploaded doc's storage path on each received record, so the receipt
-- is traceable from the coil / bundle it came in with.
alter table public.product_coils add column if not exists receipt_path text;
alter table public.tube_bundles  add column if not exists receipt_path text;
