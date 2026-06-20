-- ============================================================
-- Migration 013: Retire the legacy 'employee' role
-- ============================================================
-- The app now uses discrete roles: office_employee, warehouse_employee.
-- Any users still carrying role = 'employee' are migrated based on
-- their employee_role sub-type. The enum value remains in the DB type
-- (removing it would require recreating the enum and all dependents),
-- but it is no longer assignable from the admin UI.

UPDATE public.profiles
SET role = 'warehouse_employee'::public.user_role
WHERE role = 'employee'
  AND employee_role = 'warehouse';

UPDATE public.profiles
SET role = 'office_employee'::public.user_role
WHERE role = 'employee'
  AND (employee_role IS DISTINCT FROM 'warehouse');
