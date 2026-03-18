with source as (
    select * from {{ source('public', 'crop_details') }}
),

renamed as (
    select
        id              as crop_detail_id,
        item_id,
        item_name,
        days_to_grow,
        regrows,
        yield
    from source
)

select * from renamed