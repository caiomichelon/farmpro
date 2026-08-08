-- Bug real encontrado testando com duas contas: a policy original de
-- farm_members só deixava cada usuário ver o PRÓPRIO vínculo
-- (auth.uid() = user_id), então a tela "Membros da fazenda" nunca mostrava
-- os outros membros — só a si mesmo. Substitui por: qualquer membro da
-- fazenda pode ver todos os vínculos daquela mesma fazenda.
drop policy if exists "farm_members: usuário vê seus próprios vínculos" on public.farm_members;
drop policy if exists "farm_members: membros da fazenda se veem" on public.farm_members;
create policy "farm_members: membros da fazenda se veem"
  on public.farm_members for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_members.farm_id and fm.user_id = auth.uid()
    )
  );
