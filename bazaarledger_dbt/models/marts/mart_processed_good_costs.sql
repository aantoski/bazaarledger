{{ config(materialized='table') }}

with recursive

direct_inputs as (
    select
        pm.processed_good_id,
        pm.processed_good_name,
        pm.quantity::numeric                        as parent_quantity,
        pm.item_id                                  as raw_item_id,
        pm.item_name                                as raw_item_name,
        ic.cost_per_unit,
        (pm.quantity * coalesce(ic.cost_per_unit, 0))::numeric as total_cost,
        null::int                                   as input_good_id,
        null::int                                   as input_recipe_id
    from {{ ref('stg_processed_materials') }} pm
    left join {{ ref('stg_item_costs') }} ic
        on pm.item_id = ic.item_id
    where pm.item_id is not null

    union all

    select
        pm.processed_good_id,
        pm.processed_good_name,
        pm.quantity::numeric,
        null::int,
        null::text,
        null::numeric,
        null::numeric,
        pm.input_good_id,
        null::int
    from {{ ref('stg_processed_materials') }} pm
    where pm.input_good_id is not null

    union all

    select
        pm.processed_good_id,
        pm.processed_good_name,
        pm.quantity::numeric,
        null::int,
        null::text,
        null::numeric,
        null::numeric,
        null::int,
        pm.input_recipe_id
    from {{ ref('stg_processed_materials') }} pm
    where pm.input_recipe_id is not null
),

direct_recipe_inputs as (
    select
        ri.recipe_id,
        ri.recipe_name,
        ri.quantity::numeric                        as parent_quantity,
        ri.item_id                                  as raw_item_id,
        ri.item_name                                as raw_item_name,
        ic.cost_per_unit,
        (ri.quantity * coalesce(ic.cost_per_unit, 0))::numeric as total_cost,
        null::int                                   as input_good_id,
        null::int                                   as input_recipe_id
    from {{ ref('stg_recipe_ingredients') }} ri
    left join {{ ref('stg_item_costs') }} ic
        on ri.item_id = ic.item_id
    where ri.item_id is not null

    union all

    select
        ri.recipe_id,
        ri.recipe_name,
        ri.quantity::numeric,
        null::int,
        null::text,
        null::numeric,
        null::numeric,
        ri.input_good_id,
        ri.input_recipe_id
    from {{ ref('stg_recipe_ingredients') }} ri
    where ri.item_id is null
),

processed_tree as (

    select
        di.processed_good_id                        as root_processed_good_id,
        di.processed_good_name                      as root_processed_good_name,
        di.raw_item_id,
        di.raw_item_name,
        di.parent_quantity                          as quantity,
        di.cost_per_unit,
        di.total_cost,
        1                                           as depth,
        di.input_good_id,
        di.input_recipe_id
    from direct_inputs di

    union all

    select
        pt.root_processed_good_id,
        pt.root_processed_good_name,
        case
            when pt.input_good_id is not null then di2.raw_item_id
            when pt.input_recipe_id is not null then dri.raw_item_id
        end                                         as raw_item_id,
        case
            when pt.input_good_id is not null then di2.raw_item_name
            when pt.input_recipe_id is not null then dri.raw_item_name
        end                                         as raw_item_name,
        case
            when pt.input_good_id is not null
                then (pt.quantity * di2.parent_quantity)::numeric
            when pt.input_recipe_id is not null
                then (pt.quantity * dri.parent_quantity)::numeric
        end                                         as quantity,
        case
            when pt.input_good_id is not null then di2.cost_per_unit
            when pt.input_recipe_id is not null then dri.cost_per_unit
        end                                         as cost_per_unit,
        case
            when pt.input_good_id is not null
                then (pt.quantity * coalesce(di2.total_cost, 0))::numeric
            when pt.input_recipe_id is not null
                then (pt.quantity * coalesce(dri.total_cost, 0))::numeric
        end                                         as total_cost,
        pt.depth + 1                                as depth,
        case
            when pt.input_good_id is not null then di2.input_good_id
            when pt.input_recipe_id is not null then dri.input_good_id
        end                                         as input_good_id,
        case
            when pt.input_good_id is not null then di2.input_recipe_id
            when pt.input_recipe_id is not null then dri.input_recipe_id
        end                                         as input_recipe_id
    from processed_tree pt
    left join direct_inputs di2
        on pt.input_good_id = di2.processed_good_id
    left join direct_recipe_inputs dri
        on pt.input_recipe_id = dri.recipe_id
    where (pt.input_good_id is not null or pt.input_recipe_id is not null)
    and pt.depth < 15
)

select
    root_processed_good_id,
    root_processed_good_name,
    raw_item_id,
    raw_item_name,
    sum(quantity)                                   as total_quantity,
    max(cost_per_unit)                              as unit_cost,
    sum(total_cost)                                 as total_cost,
    max(depth)                                      as max_depth
from processed_tree
where raw_item_id is not null
group by root_processed_good_id, root_processed_good_name, raw_item_id, raw_item_name