with source as (
    select * from {{ source('public', 'recipe_ingredients') }}
),

renamed as (
    select
        id                      as recipe_ingredient_id,
        recipe_id,
        recipe_name,
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