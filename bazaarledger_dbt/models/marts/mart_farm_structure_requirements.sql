{{ config(materialized='view') }}

with

farm_structure_items as (
    select
        id                                          as item_id,
        name                                        as item_name,
        item_type,
        case
            when item_type = 'Honey'    then 'Beehive'
            when item_type = 'Mushroom' then 'Mushroom Log'
        end                                         as required_structure
    from {{ source('public', 'items') }}
    where item_type in ('Honey', 'Mushroom')
),

-- tag each processed material row with its structure requirement if any
processed_tagged as (
    select
        pm.processed_good_id,
        pm.processed_good_name,
        pm.ingredient_group,
        coalesce(pm.item_id::text, pm.input_good_id::text, pm.input_recipe_id::text) as option_key,
        fs.required_structure
    from {{ ref('stg_processed_materials') }} pm
    left join farm_structure_items fs on pm.item_id = fs.item_id
),

-- per group: does every option need a structure? if so, which?
processed_group_analysis as (
    select
        processed_good_id,
        processed_good_name,
        ingredient_group,
        bool_and(required_structure is not null)    as all_options_need_structure,
        array_agg(distinct required_structure)
            filter (where required_structure is not null) as structures
    from processed_tagged
    group by processed_good_id, processed_good_name, ingredient_group
),

processed_required as (
    select
        processed_good_id                           as root_id,
        processed_good_name                         as root_name,
        'processed'                                 as root_type,
        unnest(structures)                          as required_structure
    from processed_group_analysis
    where all_options_need_structure = true
    and array_length(structures, 1) > 0
),

-- tag each recipe ingredient row with its structure requirement if any
recipe_tagged as (
    select
        ri.recipe_id,
        ri.recipe_name,
        ri.ingredient_group,
        coalesce(ri.item_id::text, ri.input_good_id::text, ri.input_recipe_id::text) as option_key,
        -- check direct item
        case
            when fs.required_structure is not null then fs.required_structure
            -- check if input_good resolves to a farm structure item
            when ri.input_good_id is not null and pgc.raw_item_id is not null
                then fs2.required_structure
            else null
        end                                         as required_structure
    from {{ ref('stg_recipe_ingredients') }} ri
    left join farm_structure_items fs
        on ri.item_id = fs.item_id
    left join {{ ref('mart_processed_good_costs') }} pgc
        on ri.input_good_id = pgc.root_processed_good_id
    left join farm_structure_items fs2
        on pgc.raw_item_id = fs2.item_id
),

recipe_group_analysis as (
    select
        recipe_id,
        recipe_name,
        ingredient_group,
        bool_and(required_structure is not null)    as all_options_need_structure,
        array_agg(distinct required_structure)
            filter (where required_structure is not null) as structures
    from recipe_tagged
    group by recipe_id, recipe_name, ingredient_group
),

recipe_required as (
    select
        recipe_id                                   as root_id,
        recipe_name                                 as root_name,
        'recipe'                                    as root_type,
        unnest(structures)                          as required_structure
    from recipe_group_analysis
    where all_options_need_structure = true
    and array_length(structures, 1) > 0
),

combined as (
    select * from processed_required
    union all
    select * from recipe_required
)

select
    root_type,
    root_id,
    root_name,
    array_agg(distinct required_structure order by required_structure) as required_structures
from combined
group by root_type, root_id, root_name
order by root_type, root_name