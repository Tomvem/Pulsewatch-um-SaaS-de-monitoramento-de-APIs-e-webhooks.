# Changelog

Todas as mudanças relevantes deste projeto são registadas neste arquivo.

## [0.2.0] - 2026-10-12

### Adicionado

- Rotas para Monitores, Incidentes, API & Webhooks e Definições.
- Navegação lateral funcional com indicação da página ativa.
- Modal de endpoints REST com ação de cópia para cada rota.
- Modal de notificações acessível pelo ícone de sino.
- Cartões de métricas clicáveis para acesso rápido às áreas correspondentes.
- Documentação de execução com PostgreSQL local, sem Docker.

### Segurança

- Respostas de autenticação agora retornam apenas os dados públicos do utilizador; o hash da senha não é exposto.

## [0.1.0] - 2026-10-01

### Adicionado

- Dashboard de monitorização de APIs e webhooks.
- Autenticação, recuperação de senha e confirmação de email.
- PostgreSQL com Prisma, migrations e seed de demonstração.
- Worker dedicado para verificações e alertas.
