{{ config(materialized='view') }}

with animal_products as (
    select
        ap.animal_id,
        a.name                                      as animal_name,
        ap.item_id,
        i.name                                      as item_name
    from {{ source('public', 'animal_products') }} ap
    join {{ source('public', 'animals') }} a
        on ap.animal_id = a.id
    join {{ source('public', 'items') }} i
        on ap.item_id = i.id
),

-- for each ingredient group, check if ALL options are animal products
-- and collect which animals can satisfy that group
recipe_group_analysis as (
    select
        ri.recipe_id,
        ri.recipe_name,
        ri.ingredient_group,
        bool_and(ap.animal_id is not null)          as all_options_need_animal,
        -- collect all animals that can satisfy this group (OR logic)
        array_agg(distinct ap.animal_name)
            filter (where ap.animal_name is not null) as satisfying_animals
    from {{ ref('stg_recipe_ingredients') }} ri
    left join animal_products ap
        on ri.item_id = ap.item_id
    where ri.item_id is not null
    group by ri.recipe_id, ri.recipe_name, ri.ingredient_group
),

processed_group_analysis as (
    select
        pm.processed_good_id                        as recipe_id,
        pm.processed_good_name                      as recipe_name,
        pm.ingredient_group,
        bool_and(ap.animal_id is not null)          as all_options_need_animal,
        array_agg(distinct ap.animal_name)
            filter (where ap.animal_name is not null) as satisfying_animals
    from {{ ref('stg_processed_materials') }} pm
    left join animal_products ap
        on pm.item_id = ap.item_id
    where pm.item_id is not null
    group by pm.processed_good_id, pm.processed_good_name, pm.ingredient_group
),

-- keep only groups where ALL options need an animal
-- each row = one "animal requirement slot" for a recipe
-- satisfying_animals = any one of these animals satisfies this slot
required_recipe_slots as (
    select
        'recipe'                                    as root_type,
        recipe_id,
        recipe_name,
        ingredient_group,
        satisfying_animals
    from recipe_group_analysis
    where all_options_need_animal = true
    and array_length(satisfying_animals, 1) > 0
),

required_processed_slots as (
    select
        'processed'                                 as root_type,
        recipe_id,
        recipe_name,
        ingredient_group,
        satisfying_animals
    from processed_group_analysis
    where all_options_need_animal = true
    and array_length(satisfying_animals, 1) > 0
)

select * from required_recipe_slots
union all
select * from required_processed_slots
order by root_type, recipe_name, ingredient_group