with source as (
    select * from {{ source('public', 'purchasable_goods') }}
),

renamed as (
    select
        id                  as purchasable_good_id,
        item_id,
        processed_good_id,
        buy_price,
        where_to_buy
    from source
)

select * from renamed