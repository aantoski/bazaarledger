with source as (
    select * from {{ source('public', 'recipes') }}
),

renamed as (
    select
        id              as recipe_id,
        name            as recipe_name,
        category,
        sell_price,
        effect,
        utensil,
        utensil_id,
        where_to_get
    from source
)

select * from renamed