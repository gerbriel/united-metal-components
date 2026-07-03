-- Rename the Insulation category and its products to "Moisture Barrier"
-- (the product is double-bubble poly/foil; it is a moisture barrier, not thermal
-- insulation — and it should never be NAMED "bubble wrap").

-- Products first, while the category can still be found by its old slug.
update public.products
set name        = replace(replace(name, 'Bubble Wrap Insulation', 'Moisture Barrier'), 'Insulation', 'Moisture Barrier'),
    description = replace(replace(description, 'Bubble Wrap Insulation', 'Moisture Barrier'), 'Insulation', 'Moisture Barrier')
where category_id = (select id from public.product_categories where slug = 'insulation');

update public.product_categories
set name = 'Moisture Barrier',
    slug = 'moisture-barrier'
where slug = 'insulation';
