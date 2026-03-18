{{ config(materialized='table') }}

with item_costs as (
    select * from {{ ref('stg_item_costs') }}
),

ingredient_options as (
    -- raw item options
    select
        ri.recipe_id,
        ri.ingredient_group,
        ri.item_id                                  as option_id,
        ri.item_name                                as option_name,
        'item'                                      as option_type,
        (ri.quantity * coalesce(ic.cost_per_unit, 0))::numeric as option_cost
    from {{ ref('stg_recipe_ingredients') }} ri
    left join item_costs ic on ri.item_id = ic.item_id
    where ri.item_id is not null

    union all

    -- processed good options
    select
        ri.recipe_id,
        ri.ingredient_group,
        pgc.root_processed_good_id                  as option_id,
        pgc.root_processed_good_name                as option_name,
        'processed'                                 as option_type,
        (ri.quantity * sum(pgc.total_cost))::numeric as option_cost
    from {{ ref('stg_recipe_ingredients') }} ri
    join {{ ref('mart_processed_good_costs') }} pgc
        on ri.input_good_id = pgc.root_processed_good_id
    where ri.input_good_id is not null
    group by ri.recipe_id, ri.ingredient_group,
             pgc.root_processed_good_id, pgc.root_processed_good_name,
             ri.quantity
),

-- cheapest option per group (raw items and processed goods only)
cheapest_per_group as (
    select
        recipe_id,
        ingredient_group,
        min(option_cost)                            as cheapest_option_cost
    from ingredient_options
    group by recipe_id, ingredient_group
),

-- base recipe costs (no sub-recipes yet)
base_costs as (
    select
        recipe_id,
        sum(cheapest_option_cost)                   as base_ingredient_cost
    from cheapest_per_group
    group by recipe_id
)

select * from base_costs