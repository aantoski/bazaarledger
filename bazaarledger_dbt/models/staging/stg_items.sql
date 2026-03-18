with source as (
    select * from {{ source('public', 'items') }}
),

renamed as (
    select
        id                              as item_id,
        name                            as item_name,
        item_type,
        item_type_id,
        sell_price,
        buy_price,
        is_crop_variant,
        base_item_id,
        base_item_name
    from source
)

select * from renamed