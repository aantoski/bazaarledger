{{ config(materialized='view') }}

with recipes as (
    select * from {{ ref('stg_recipes') }}
),

-- use the fully resolved ingredient tree for costs
ingredient_tree as (
    select
        root_recipe_id,
        root_recipe_name,
        sum(total_cost)                         as total_ingredient_cost,
        bool_or(total_cost is null)             as has_unresolved_ingredients
    from {{ ref('mart_ingredient_tree') }}
    where root_type = 'recipe'
    group by root_recipe_id, root_recipe_name
)

select
    r.recipe_id,
    r.recipe_name,
    r.category,
    r.utensil,
    r.sell_price,
    it.total_ingredient_cost,
    it.has_unresolved_ingredients,
    case
        when it.total_ingredient_cost is not null
        then r.sell_price - it.total_ingredient_cost
        else null
    end                                         as gross_profit,
    case
        when it.total_ingredient_cost is not null and r.sell_price > 0
        then round(
            ((r.sell_price - it.total_ingredient_cost) / r.sell_price::numeric) * 100,
            2
        )
        else null
    end                                         as profit_margin_pct,
    case
        when it.total_ingredient_cost is null then 'incomplete'
        when r.sell_price - it.total_ingredient_cost > 0 then 'profitable'
        else 'unprofitable'
    end                                         as profitability_status
from recipes r
left join ingredient_tree it on r.recipe_id = it.root_recipe_id
order by gross_profit desc nulls last