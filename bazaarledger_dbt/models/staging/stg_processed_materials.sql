with source as (
    select * from {{ source('public', 'processed_materials') }}
),

renamed as (
    select
        id                      as processed_material_id,
        processed_good_id,
        processed_good_name,
        item_id,
        item_name,
        quantity,
        ingredient_group,
        input_good_id,
        input_good_name,
        input_recipe_id,
        input_recipe_name
    from source
)

select * from renamed