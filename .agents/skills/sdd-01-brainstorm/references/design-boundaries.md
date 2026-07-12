# Design Para Isolamento e Clareza

Divida o sistema em unidades menores, com uma responsabilidade clara, interfaces bem definidas e dependências explícitas.

Para cada unidade, consiga responder:

- O que ela faz?
- Como é usada?
- Do que depende?
- O que ela entrega para outras partes?
- Como será testada?

Boas fronteiras permitem entender uma unidade sem ler todos os seus detalhes internos. Também permitem mudar a implementação sem quebrar consumidores.

Se uma unidade só pode ser entendida lendo o sistema inteiro, a fronteira provavelmente está ruim.

Arquivos menores e bem focados ajudam o agente a raciocinar melhor. Quando um arquivo cresce demais ou mistura responsabilidades, considere incluir uma melhoria local no design, desde que ela sirva diretamente ao objetivo atual.
