with items as (
    select * from {{ ref('stg_items') }}
),

crop_details as (
    select * from {{ ref('stg_crop_details') }}
),

purchasable as (
    select
        item_id,
        min(buy_price) as cheapest_buy_price
    from {{ ref('stg_purchasable_goods') }}
    where item_id is not null
    group by item_id
),

-- for crop variants, look up the base item's cost
base_items as (
    select
        i.item_id,
        i.item_name,
        coalesce(p.cheapest_buy_price, i.buy_price) as effective_buy_price,
        cd.yield
    from items i
    left join crop_details cd   on i.item_id = cd.item_id
    left join purchasable p     on i.item_id = p.item_id
)

select
    i.item_id,
    i.item_name,
    i.item_type,
    i.sell_price,
    i.buy_price                                 as seed_price,
    cd.yield,
    cd.days_to_grow,
    cd.regrows,
    p.cheapest_buy_price,
    case
        -- crop variant: use base item's cost per unit
        when i.is_crop_variant = true and i.base_item_id is not null
            then coalesce(
                round(bi.effective_buy_price::numeric / nullif(bi.yield, 0), 2),
                0
            )
        -- regular crop: seed price divided by yield
        when i.item_type in ('Crop', 'Mushroom') and cd.yield is not null and cd.yield > 0
            then round(
                coalesce(p.cheapest_buy_price, i.buy_price)::numeric / cd.yield,
                2
            )
        -- everything else: cheapest purchasable or 0
        else coalesce(p.cheapest_buy_price, i.buy_price, 0)
    end                                         as cost_per_unit
from items i
left join crop_details cd       on i.item_id = cd.item_id
left join purchasable p         on i.item_id = p.item_id
left join base_items bi         on i.base_item_id = bi.item_id