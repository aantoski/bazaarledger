{{ config(materialized='view') }}

with

-- processed goods that directly require wonderstone
wonderstone_goods as (
    select id as processed_good_id, name as processed_good_name
    from {{ source('public', 'processed_goods') }}
    where requires_wonderstone = true
),

-- processed goods whose ingredient chain includes a wonderstone good
-- use mart_processed_good_costs to find which goods use wonderstone goods as inputs
processed_wonderstone as (
    -- direct: the good itself requires wonderstone
    select
        processed_good_id,
        processed_good_name,
        true                                        as requires_wonderstone
    from wonderstone_goods

    union

    -- indirect: the good uses a wonderstone good somewhere in its chain
    select distinct
        pm.processed_good_id,
        pm.processed_good_name,
        true                                        as requires_wonderstone
    from {{ ref('stg_processed_materials') }} pm
    join wonderstone_goods wg
        on pm.input_good_id = wg.processed_good_id
),

-- recipes that require wonderstone directly or via ingredients
recipe_wonderstone as (
    -- direct: recipe uses a wonderstone processed good
    select distinct
        ri.recipe_id,
        ri.recipe_name,
        true                                        as requires_wonderstone
    from {{ ref('stg_recipe_ingredients') }} ri
    join wonderstone_goods wg
        on ri.input_good_id = wg.processed_good_id

    union

    -- indirect: recipe uses a processed good that itself needs wonderstone
    select distinct
        ri.recipe_id,
        ri.recipe_name,
        true                                        as requires_wonderstone
    from {{ ref('stg_recipe_ingredients') }} ri
    join processed_wonderstone pw
        on ri.input_good_id = pw.processed_good_id
)

select
    'processed'                                     as root_type,
    processed_good_id                               as root_id,
    processed_good_name                             as root_name,
    requires_wonderstone
from processed_wonderstone

union all

select
    'recipe'                                        as root_type,
    recipe_id                                       as root_id,
    recipe_name                                     as root_name,
    requires_wonderstone
from recipe_wonderstone
order by root_type, root_name