with items as (
    select * from {{ ref('stg_items') }}
),

seasons as (
    select * from {{ ref('stg_item_seasons') }}
),

crop_details as (
    select * from {{ ref('stg_crop_details') }}
),

purchasable as (
    select * from {{ ref('stg_purchasable_goods') }}
),

-- aggregate seasons into an array per item
item_seasons_agg as (
    select
        item_id,
        array_agg(season order by season) as seasons
    from seasons
    group by item_id
),

-- get cheapest buy price per item across all vendors
cheapest_price as (
    select
        item_id,
        min(buy_price) as cheapest_buy_price,
        string_agg(where_to_buy, ', ' order by buy_price) as where_to_buy
    from purchasable
    where item_id is not null
    group by item_id
)

select
    i.item_id,
    i.item_name,
    i.item_type,
    i.sell_price,
    i.buy_price                             as base_buy_price,
    coalesce(p.cheapest_buy_price, i.buy_price) as cheapest_buy_price,
    p.where_to_buy,
    i.is_crop_variant,
    i.base_item_id,
    i.base_item_name,
    cd.days_to_grow,
    cd.regrows,
    cd.yield,
    coalesce(sa.seasons, array[]::text[])   as seasons,
    array_length(coalesce(sa.seasons, array[]::text[]), 1) as season_count
from items i
left join item_seasons_agg sa   on i.item_id = sa.item_id
left join crop_details cd       on i.item_id = cd.item_id
left join cheapest_price p      on i.item_id = p.item_id
order by i.item_name