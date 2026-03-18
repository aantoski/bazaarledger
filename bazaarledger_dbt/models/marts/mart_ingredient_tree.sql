{{ config(materialized='table') }}

with recursive

direct_ingredients as (
    select
        ri.recipe_id                                as recipe_id,
        ri.recipe_name                              as recipe_name,
        ri.quantity::numeric                        as parent_quantity,
        ri.item_id                                  as raw_item_id,
        ri.item_name                                as raw_item_name,
        ic.cost_per_unit                            as unit_cost,
        (ri.quantity * coalesce(ic.cost_per_unit, 0))::numeric as total_cost,
        null::int                                   as input_recipe_id
    from {{ ref('stg_recipe_ingredients') }} ri
    left join {{ ref('stg_item_costs') }} ic
        on ri.item_id = ic.item_id
    where ri.item_id is not null

    union all

    select
        ri.recipe_id,
        ri.recipe_name,
        ri.quantity::numeric                        as parent_quantity,
        pgc.raw_item_id,
        pgc.raw_item_name,
        pgc.unit_cost,
        (ri.quantity * pgc.total_cost)::numeric     as total_cost,
        null::int                                   as input_recipe_id
    from {{ ref('stg_recipe_ingredients') }} ri
    join {{ ref('mart_processed_good_costs') }} pgc
        on ri.input_good_id = pgc.root_processed_good_id
    where ri.input_good_id is not null

    union all

    select
        ri.recipe_id,
        ri.recipe_name,
        ri.quantity::numeric                        as parent_quantity,
        null::int                                   as raw_item_id,
        null::text                                  as raw_item_name,
        null::numeric                               as unit_cost,
        null::numeric                               as total_cost,
        ri.input_recipe_id
    from {{ ref('stg_recipe_ingredients') }} ri
    where ri.input_recipe_id is not null
),

recipe_tree as (

    select
        di.recipe_id                                as root_recipe_id,
        di.recipe_name                              as root_recipe_name,
        di.raw_item_id,
        di.raw_item_name,
        di.parent_quantity                          as quantity,
        di.unit_cost,
        di.total_cost,
        1                                           as depth,
        di.input_recipe_id
    from direct_ingredients di

    union all

    select
        rt.root_recipe_id,
        rt.root_recipe_name,
        di2.raw_item_id,
        di2.raw_item_name,
        (rt.quantity * di2.parent_quantity)::numeric as quantity,
        di2.unit_cost,
        (rt.quantity * coalesce(di2.total_cost, 0))::numeric as total_cost,
        rt.depth + 1                                as depth,
        di2.input_recipe_id
    from recipe_tree rt
    join direct_ingredients di2
        on rt.input_recipe_id = di2.recipe_id
    where rt.input_recipe_id is not null
    and rt.depth < 15
)

select
    root_recipe_id,
    root_recipe_name,
    'recipe'                                        as root_type,
    raw_item_id,
    raw_item_name,
    sum(quantity)                                   as total_quantity,
    max(unit_cost)                                  as unit_cost,
    sum(total_cost)                                 as total_cost,
    max(depth)                                      as max_depth
from recipe_tree
where raw_item_id is not null
group by root_recipe_id, root_recipe_name, raw_item_id, raw_item_name

union all

select
    root_processed_good_id                          as root_recipe_id,
    root_processed_good_name                        as root_recipe_name,
    'processed'                                     as root_type,
    raw_item_id,
    raw_item_name,
    total_quantity,
    unit_cost,
    total_cost,
    max_depth
from {{ ref('mart_processed_good_costs') }}