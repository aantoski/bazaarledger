{{ config(materialized='view') }}

with

item_costs as (
    select * from {{ ref('stg_item_costs') }}
),

-- cost per option per ingredient group for processed goods
ingredient_options as (
    -- raw item options
    select
        pm.processed_good_id,
        pm.ingredient_group,
        pm.item_id                                  as option_id,
        pm.item_name                                as option_name,
        'item'                                      as option_type,
        (pm.quantity * coalesce(ic.cost_per_unit, 0))::numeric as option_cost
    from {{ ref('stg_processed_materials') }} pm
    left join item_costs ic on pm.item_id = ic.item_id
    where pm.item_id is not null

    union all

    -- processed good inputs (use pre-resolved costs)
    select
        pm.processed_good_id,
        pm.ingredient_group,
        pgc.root_processed_good_id                  as option_id,
        pgc.root_processed_good_name                as option_name,
        'processed'                                 as option_type,
        (pm.quantity * sum(pgc.total_cost))::numeric as option_cost
    from {{ ref('stg_processed_materials') }} pm
    join {{ ref('mart_processed_good_costs') }} pgc
        on pm.input_good_id = pgc.root_processed_good_id
    where pm.input_good_id is not null
    group by pm.processed_good_id, pm.ingredient_group,
             pgc.root_processed_good_id, pgc.root_processed_good_name,
             pm.quantity

    union all

    -- recipe inputs
    select
        pm.processed_good_id,
        pm.ingredient_group,
        pm.input_recipe_id                          as option_id,
        pm.input_recipe_name                        as option_name,
        'recipe'                                    as option_type,
        (pm.quantity * coalesce(rc.base_ingredient_cost, 0))::numeric as option_cost
    from {{ ref('stg_processed_materials') }} pm
    left join {{ ref('mart_recipe_costs') }} rc
        on pm.input_recipe_id = rc.recipe_id
    where pm.input_recipe_id is not null
),

-- cheapest option per ingredient group
cheapest_per_group as (
    select
        processed_good_id,
        ingredient_group,
        min(option_cost)                            as cheapest_option_cost
    from ingredient_options
    group by processed_good_id, ingredient_group
),

-- sum cheapest options across all groups
processed_costs as (
    select
        processed_good_id,
        sum(cheapest_option_cost)                   as total_ingredient_cost
    from cheapest_per_group
    group by processed_good_id
),

processed_goods as (
    select
        id                                          as processed_good_id,
        name                                        as processed_good_name,
        sell_price,
        machine_id
    from {{ source('public', 'processed_goods') }}
    where sell_price is not null
),

machines as (
    select id as machine_id, name as machine_name
    from {{ source('public', 'machines') }}
)

select
    pg.processed_good_id,
    pg.processed_good_name,
    m.machine_name,
    pg.sell_price,
    pc.total_ingredient_cost,
    case
        when pc.total_ingredient_cost is not null
        then pg.sell_price - pc.total_ingredient_cost
        else null
    end                                             as gross_profit,
    case
        when pc.total_ingredient_cost is not null and pg.sell_price > 0
        then round(
            ((pg.sell_price - pc.total_ingredient_cost) / pg.sell_price::numeric) * 100,
            2
        )
        else null
    end                                             as profit_margin_pct,
    case
        when pc.total_ingredient_cost is null then 'incomplete'
        when pg.sell_price - pc.total_ingredient_cost > 0 then 'profitable'
        else 'unprofitable'
    end                                             as profitability_status
from processed_goods pg
left join processed_costs pc
    on pg.processed_good_id = pc.processed_good_id
left join machines m
    on pg.machine_id = m.machine_id
order by gross_profit desc nulls last