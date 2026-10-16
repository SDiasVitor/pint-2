"""
WoodScan - Simulador das esteiras (roda na Raspberry Pi) - versao POO

Cada envio representa UMA lamina cortada por uma esteira, com uma leitura
simulada de temperatura e umidade. Os dados vao em JSON (HTTP POST) para o
Node-RED, que roda no PC.

Novidade: antes de sortear, o simulador consulta no Node-RED quais esteiras
foram PARADAS PARA MANUTENCAO pelo botao do site. Esteira parada nao gera
mais leituras ate alguem apertar o botao de novo.

Uso:
    python3 simulador_esteiras_poo.py
    (Ctrl+C para parar)
"""

import random
import time

import requests


class Esteira:
    """Uma maquina da linha de corte."""

    def __init__(self, codigo: str):
        self.codigo = codigo
        self.pulsos_enviados = 0
        self.parada = False  # True quando o site manda parar para manutencao

    def gerar_leitura(self) -> dict:
        """Simula o sensor: uma lamina cortada + temperatura e umidade do ambiente."""
        return {
            "esteira": self.codigo,
            "temperatura": round(random.uniform(22.0, 34.0), 1),
            "umidade": round(random.uniform(45.0, 80.0), 1),
        }

    def registrar_envio(self) -> None:
        self.pulsos_enviados += 1


class ClienteNodeRed:
    """Cuida so da comunicacao HTTP com o Node-RED."""

    def __init__(self, host: str, porta: int = 1880):
        base = f"http://{host}:{porta}"
        self.url = f"{base}/api/eventos"
        self.url_status = f"{base}/api/status-esteiras"

    def enviar(self, leitura: dict) -> dict:
        """Envia uma leitura. Devolve o JSON de resposta ou levanta erro."""
        resposta = requests.post(self.url, json=leitura, timeout=5)
        if resposta.status_code not in (200, 201):
            raise RuntimeError(f"[ERRO {resposta.status_code}] {resposta.text}")
        return resposta.json()

    def buscar_status(self) -> dict:
        """Devolve {"esteira1": {"parada": False, ...}, ...}"""
        resposta = requests.get(self.url_status, timeout=5)
        resposta.raise_for_status()
        return resposta.json().get("esteiras", {})


class SimuladorWoodScan:
    """Coordena as esteiras e o envio das leituras."""

    INTERVALO_STATUS = 3.0  # de quantos em quantos segundos consulta as paradas

    def __init__(self, codigos_esteiras: list, host_node_red: str, porta_node_red: int = 1880,
                 intervalo_min: float = 1.0, intervalo_max: float = 4.0):
        self.esteiras = [Esteira(codigo) for codigo in codigos_esteiras]
        self.cliente = ClienteNodeRed(host_node_red, porta_node_red)
        self.intervalo_min = intervalo_min
        self.intervalo_max = intervalo_max
        self._ultima_consulta = 0.0
        self._avisou_status_offline = False
        self._avisou_todas_paradas = False

    def atualizar_status(self) -> None:
        """Pergunta ao Node-RED quais esteiras estao paradas (no maximo a cada 3 s)."""
        agora = time.time()
        if agora - self._ultima_consulta < self.INTERVALO_STATUS:
            return
        self._ultima_consulta = agora

        try:
            status = self.cliente.buscar_status()
            self._avisou_status_offline = False
        except (requests.exceptions.RequestException, ValueError) as erro:
            # sem resposta: mantem o ultimo status conhecido
            if not self._avisou_status_offline:
                print(f"[AVISO] Nao consegui consultar as paradas ({erro}). Mantendo o ultimo status.")
                self._avisou_status_offline = True
            return

        for esteira in self.esteiras:
            nova = bool(status.get(esteira.codigo, {}).get("parada", False))
            if nova and not esteira.parada:
                print(f"[PARADA] {esteira.codigo} parada para manutencao - sem novas leituras.")
            elif not nova and esteira.parada:
                print(f"[RETOMADA] {esteira.codigo} voltou a produzir.")
            esteira.parada = nova

    def esteiras_ativas(self) -> list:
        return [esteira for esteira in self.esteiras if not esteira.parada]

    def enviar_leitura(self, esteira: Esteira) -> None:
        leitura = esteira.gerar_leitura()
        try:
            dados = self.cliente.enviar(leitura)
            esteira.registrar_envio()
            print(
                f"[OK] {esteira.codigo} -> turno {dados.get('turno')} | "
                f"{leitura['temperatura']}°C | {leitura['umidade']}% | {dados.get('status')}"
            )
        except requests.exceptions.RequestException as erro:
            print(f"[FALHA DE CONEXAO] {esteira.codigo} -> {erro}")
        except RuntimeError as erro:
            print(f"{erro} ({esteira.codigo})")

    def mostrar_resumo(self) -> None:
        print("\nResumo da simulação:")
        for esteira in self.esteiras:
            situacao = " (parada)" if esteira.parada else ""
            print(f"  {esteira.codigo}: {esteira.pulsos_enviados} pulsos enviados{situacao}")

    def executar(self) -> None:
        print(f"Simulando leituras para o Node-RED em: {self.cliente.url}")
        print("Ctrl+C para parar.\n")
        try:
            while True:
                self.atualizar_status()
                ativas = self.esteiras_ativas()

                if not ativas:
                    if not self._avisou_todas_paradas:
                        print("[AVISO] Todas as esteiras estao paradas. Aguardando retomada...")
                        self._avisou_todas_paradas = True
                    time.sleep(self.INTERVALO_STATUS)
                    continue
                self._avisou_todas_paradas = False

                self.enviar_leitura(random.choice(ativas))
                time.sleep(random.uniform(self.intervalo_min, self.intervalo_max))
        except KeyboardInterrupt:
            print("\nSimulacao encerrada.")
            self.mostrar_resumo()


if __name__ == "__main__":
    NODE_RED_HOST = "10.110.12.62"  # <-- IP do PC onde roda o Node-RED (confira com ipconfig)
    NODE_RED_PORT = 1880

    simulador = SimuladorWoodScan(
        codigos_esteiras=["esteira1", "esteira2", "esteira3", "esteira4", "esteira5"],
        host_node_red=NODE_RED_HOST,
        porta_node_red=NODE_RED_PORT,
    )
    simulador.executar()
