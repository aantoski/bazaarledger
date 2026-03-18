with items as (
    select * from {{ ref('stg_items') }}
),

seasons as (
    select * from {{ ref('stg_item_seasons') }}
),

crop_details as (
    select * from {{ ref('stg_crop_details') }}
),

seasonal_items as (
    select
        s.season,
        i.item_id,
        i.item_name,
        i.item_type,
        i.sell_price,
        i.buy_price,
        i.is_crop_variant,
        cd.days_to_grow,
        cd.regrows,
        cd.yield
    from seasons s
    left join items i
        on s.item_id = i.item_id
    left join crop_details cd
        on i.item_id = cd.item_id
)

select * from seasonal_items
order by season, item_name