with source as (
    select * from {{ source('public', 'item_seasons') }}
),

renamed as (
    select
        id              as item_season_id,
        item_id,
        item_name,
        season
    from source
)

select * from renamed