-- Recipes members can see must be complete and not placeholder content (review before applying).
-- NOT VALID: existing rows are not re-checked (none fail today); every new or edited published row is.
alter table public.recipes add constraint recipes_published_complete check (
  not published or (
    kcal > 0 and kcal <= 5000 and protein >= 0 and minutes > 0
    and cardinality(ingredients) > 0 and cardinality(steps) > 0
    and title !~* '^\s*(test|testing)\s*$'
  )) not valid;
