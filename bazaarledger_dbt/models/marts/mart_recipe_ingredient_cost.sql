{{ config(materialized='table') }}

-- This model resolves sub-recipe costs by looking up
-- already-resolved recipes in mart_ingredient_tree,
-- then iterates until all chains are resolved.

with recursive recipe_cost_tree as (

    -- BASE CASE: recipes whose ingredients are all raw items
    -- (already fully resolved in mart_ingredient_tree)
    select
        r.recipe_id                             as root_recipe_id,
        r.recipe_name                           as root_recipe_name,
        sum(t.total_cost)                       as total_ingredient_cost,
        bool_or(t.total_cost is null)           as has_unresolved,
        1                                       as depth
    from "postgres"."dbt_dev"."stg_recipes" r
    join "postgres"."dbt_dev"."mart_ingredient_tree" t
        on r.recipe_id = t.root_recipe_id
        and t.root_type = 'recipe'
    group by r.recipe_id, r.recipe_name

    union all

    -- RECURSIVE CASE: recipes that use other recipes as ingredients
    -- look up sub-recipe costs from already resolved entries
    select
        ri.recipe_id                            as root_recipe_id,
        ri.recipe_name                          as root_recipe_name,
        sum(
            case
                when ri.item_id is not null
                    then ri.quantity * ic.cost_per_unit
                when ri.input_recipe_id is not null
                    then ri.quantity * rct.total_ingredient_cost
                else null
            end
        )                                       as total_ingredient_cost,
        bool_or(
            case
                when ri.item_id is not null then ic.cost_per_unit is null
                when ri.input_recipe_id is not null then rct.total_ingredient_cost is null
                else true
            end
        )                                       as has_unresolved,
        rct.depth + 1                           as depth
    from "postgres"."dbt_dev"."stg_recipe_ingredients" ri
    join recipe_cost_tree rct
        on ri.input_recipe_id = rct.root_recipe_id
    left join "postgres"."dbt_dev"."stg_item_costs" ic
        on ri.item_id = ic.item_id
    where ri.input_recipe_id is not null
    and rct.depth < 10
    group by ri.recipe_id, ri.recipe_name, rct.depth
),

-- take the most resolved version of each recipe
best_resolution as (
    select distinct on (root_recipe_id)
        root_recipe_id,
        root_recipe_name,
        total_ingredient_cost,
        has_unresolved,
        depth
    from recipe_cost_tree
    order by root_recipe_id, has_unresolved asc, depth asc
)

select * from best_resolution