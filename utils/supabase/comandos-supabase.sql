-- para redefinir senha
update auth.users
set encrypted_password = crypt('senha', gen_salt('bf'))
where email = 'joaopsroberto@gmail.com';

-- para confirmar email
update auth.users
set email_confirmed_at = now()
where email = 'joaopsroberto@gmail.com';