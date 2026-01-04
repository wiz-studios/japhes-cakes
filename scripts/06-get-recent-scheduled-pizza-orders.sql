-- SQL function for Supabase to fetch recent scheduled pizza orders after 9 PM (Africa/Nairobi)
create or replace function get_recent_scheduled_pizza_orders()
returns table (
    order_id uuid,
    customer_name text,
    placed_at timestamptz,
    scheduled_date date,
    status text,
    payment_status text
) as $$
begin
    return query
    select
        id as order_id,
        customer_name,
        created_at as placed_at,
        preferred_date as scheduled_date,
        status,
        payment_status
    from orders
    where order_type = 'pizza'
      and extract(hour from created_at at time zone 'Africa/Nairobi') >= 21
    order by created_at desc;
end;
$$ language plpgsql stable;
