# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-07-17

### Adicionado
- Nova funcionalidade de **Ajuste de orçamento ao longo do ano** (Feature 2).
- Navegação e visualização mensal de metas financeiras através de um seletor de Mês (dropdown compacto) ao lado do seletor de Ano.
- Edição inline direta nas células de valores orçados na tabela, com salvamento automático nos eventos de `onBlur` ou ao pressionar `Enter` com prevenção de recarregamentos indesejados.
- Regra de "Mês Aberto": bloqueio de edições em meses anteriores ao mês ativo (tornando as previsões somente-leitura) e liberação nos meses vigentes/futuros.
- Suporte à testabilidade do mês ativo em desenvolvimento e testes utilizando o query parameter `?mockMonth=M` (lido via hook `useSearchParams` do Next.js).
- Ocultação na tabela de categorias que tenham valor previsto igual a 0 a partir do mês em questão.
- Nova skill `sdd-writer-changelog` para automatizar a manutenção de CHANGELOG e README.
- Regra rígida Anti-Tentativa-e-Erro nas skills de depuração e execução de tarefas.
