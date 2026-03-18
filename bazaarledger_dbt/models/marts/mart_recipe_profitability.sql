{{ config(materialized='view') }}

with recipes as (
    select * from {{ ref('stg_recipes') }}
),

item_costs as (
    select * from {{ ref('stg_item_costs') }}
),

base_recipe_costs as (
    select * from {{ ref('mart_recipe_costs') }}
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

    union all

    -- sub-recipe options using pre-calculated base costs
    select
        ri.recipe_id,
        ri.ingredient_group,
        ri.input_recipe_id                          as option_id,
        ri.input_recipe_name                        as option_name,
        'recipe'                                    as option_type,
        (ri.quantity * coalesce(brc.base_ingredient_cost, 0))::numeric as option_cost
    from {{ ref('stg_recipe_ingredients') }} ri
    left join base_recipe_costs brc
        on ri.input_recipe_id = brc.recipe_id
    where ri.input_recipe_id is not null
),

cheapest_per_group as (
    select
        recipe_id,
        ingredient_group,
        min(option_cost)                            as cheapest_option_cost
    from ingredient_options
    group by recipe_id, ingredient_group
),

recipe_costs as (
    select
        recipe_id,
        sum(cheapest_option_cost)                   as total_ingredient_cost,
        bool_or(cheapest_option_cost is null)       as has_unresolved_ingredients
    from cheapest_per_group
    group by recipe_id
)

select
    r.recipe_id,
    r.recipe_name,
    r.category,
    r.utensil,
    r.sell_price,
    rc.total_ingredient_cost,
    rc.has_unresolved_ingredients,
    case
        when rc.total_ingredient_cost is not null
        then r.sell_price - rc.total_ingredient_cost
        else null
    end                                             as gross_profit,
    case
        when rc.total_ingredient_cost is not null and r.sell_price > 0
        then round(
            ((r.sell_price - rc.total_ingredient_cost) / r.sell_price::numeric) * 100,
            2
        )
        else null
    end                                             as profit_margin_pct,
    case
        when rc.total_ingredient_cost is null then 'incomplete'
        when r.sell_price - rc.total_ingredient_cost > 0 then 'profitable'
        else 'unprofitable'
    end                                             as profitability_status
from recipes r
left join recipe_costs rc on r.recipe_id = rc.recipe_id
order by gross_profit desc nulls last