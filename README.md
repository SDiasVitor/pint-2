# 🪵 WoodScan

Sistema de **contagem automatizada de lâminas de madeira** desenvolvido para o desafio
da **Laminados Madeiras do Norte**, no Projeto Integrador do curso de Análise e
Desenvolvimento de Sistemas – Faculdade de Tecnologia SENAI Antonio Adolpho Lobbe (São Carlos/SP).

**Equipe:** Vitor de Souza Dias e Renan Buzelatto

---

## 📌 O problema
A contagem das lâminas nos pallets e lotes era feita à mão: um processo lento, sujeito a erros,
que gera divergência de estoque e risco ergonômico para o operador.

## 💡 A solução
O WoodScan conta automaticamente a produção de cada esteira, em tempo real e por turno, e oferece:

- Painel com a contagem, temperatura e umidade de cada esteira
- Produção separada por turno (manhã, tarde e noite) e histórico por dia
- Parada de esteira pelo operador e liberação apenas pela equipe de manutenção (com login próprio)
- Registro do tempo parado, do tipo de manutenção e do defeito encontrado
- Cadastro de novas esteiras pelo site
- Dashboard, página de análise de dados (média, mediana e moda) e relatório no Power BI
- Tema claro e escuro

## 🏗️ Arquitetura

    Raspberry Pi (simulador Python) --HTTP/JSON--> Node-RED (API) <--API REST--> Site React
                                                      |
                                                      v
                                     CSV (produção, paradas, manutenções)
                                     MySQL (usuários e esteiras) --> Power BI

## 🧰 Tecnologias e disciplinas aplicadas

| Disciplina | Onde foi aplicada |
|---|---|
| Automação Industrial | Raspberry Pi simulando o sensor de fim de curso, temperatura e umidade |
| Programação Back-end (POO) | Simulador em Python com classe abstrata, herança, polimorfismo e encapsulamento; API no Node-RED |
| Front-end (React) | Componentes, hooks, React Router com rotas protegidas e Context API |
| Computação em Nuvem | Arquitetura cliente-servidor, API REST e containers Docker |
| Ciência de Dados | Média, mediana e moda (classe modal), histogramas e Power BI |

## 📁 Estrutura do repositório

    WoodScan/WoodScan/
    ├── Bancodedados/        scripts SQL do MySQL
    ├── Nodered/             fluxos do Node-RED
    ├── Powerbi/             relatório (.pbix) e tema
    ├── Simuladoresteiras/   simulador da Raspberry Pi (Python POO)
    └── WoodScan/WoodScan/   site em React (Vite)
    woodscan-docker/         sistema completo em containers

## 🐳 Como rodar com Docker

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e aberto.

    git clone https://github.com/SDiasVitor/pint-2.git
    cd pint-2/woodscan-docker
    docker compose up -d --build

| Serviço | Endereço |
|---|---|
| Site | http://localhost:8080 |
| Node-RED | http://localhost:1880 |
| MySQL | porta 3307 |

**Logins de teste:** operador `teste1` / `123456` · manutenção `manutencao1` / `1234`

Na Raspberry Pi, configure o `NODE_RED_HOST` do `simulador_esteiras_poo.py` com o IP do PC
que está rodando o Docker e execute:

    python3 simulador_esteiras_poo.py

Para desligar: `docker compose down`
