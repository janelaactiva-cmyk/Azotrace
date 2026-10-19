-- 1) Cria primeiro a conta do proprietário do Azotrace em Supabase > Authentication > Users.
-- 2) Substitui o email abaixo e executa este SQL UMA VEZ.

update public.profiles
set platform_role = 'superadmin',
    active = true,
    updated_at = now()
where lower(email) = lower('SEU_EMAIL@EXEMPLO.PT');

select id, email, name, platform_role, active
from public.profiles
where lower(email) = lower('SEU_EMAIL@EXEMPLO.PT');
