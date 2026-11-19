"""
WoodScan - Simulador das esteiras (roda na Raspberry Pi) - versao POO com POLIMORFISMO

- Esteira (classe-base abstrata) define o que toda maquina tem.
- EsteiraSerraCircular, EsteiraGuilhotina e EsteiraLaminadora HERDAM de Esteira
  e cada uma SOBRESCREVE gerar_leitura() e ritmo() do seu jeito (polimorfismo).
- FabricaDeEsteiras cria o objeto certo a partir do TIPO cadastrado no site.
- O simulador busca a lista de esteiras no Node-RED a cada 3 s:
  esteira nova cadastrada no site ja entra sozinha, com a classe do tipo dela.
- Esteira parada para manutencao nao gera leituras ate ser liberada.

Uso:
    python3 simulador_esteiras_poo.py
    (Ctrl+C para parar)
"""

import random
import time
from abc import ABC, abstractmethod

import requests


# ---------------------------------------------------------------------
# HERANCA + POLIMORFISMO
# ---------------------------------------------------------------------
class Esteira(ABC):
    """Classe-base: o que toda maquina da linha de corte tem."""

    nome_tipo = "generica"

    def __init__(self, codigo: str):
        self.codigo = codigo
        self.pulsos_enviados = 0
        self.parada = False  # True quando o site manda parar para manutencao

    @abstractmethod
    def gerar_leitura(self) -> dict:
        """Cada tipo de maquina simula o sensor do seu jeito."""

    @abstractmethod
    def ritmo(self) -> float:
        """Peso no sorteio: maquina mais rapida corta mais laminas."""

    def _leitura(self, temp_min, temp_max, umid_min, umid_max) -> dict:
        # metodo auxiliar herdado por todas as filhas
        return {
            "esteira": self.codigo,
            "temperatura": round(random.uniform(temp_min, temp_max), 1),
            "umidade": round(random.uniform(umid_min, umid_max), 1),
        }

    def registrar_envio(self) -> None:
        self.pulsos_enviados += 1

    def __str__(self) -> str:
        return f"{self.codigo} ({self.nome_tipo})"


class EsteiraSerraCircular(Esteira):
    """Corta rapido e esquenta mais."""

    nome_tipo = "serra circular"

    def gerar_leitura(self) -> dict:
        return self._leitura(28.0, 38.0, 40.0, 65.0)

    def ritmo(self) -> float:
        return 3.0


class EsteiraGuilhotina(Esteira):
    """Corte mais lento, quase nao aquece."""

    nome_tipo = "guilhotina"

    def gerar_leitura(self) -> dict:
        return self._leitura(22.0, 29.0, 45.0, 70.0)

    def ritmo(self) -> float:
        return 1.0


class EsteiraLaminadora(Esteira):
    """Torno laminador: madeira umida (vem do cozimento), ritmo medio."""

    nome_tipo = "laminadora"

    def gerar_leitura(self) -> dict:
        return self._leitura(25.0, 33.0, 65.0, 85.0)

    def ritmo(self) -> float:
        return 2.0


class FabricaDeEsteiras:
    """Cria o objeto da classe certa a partir do tipo cadastrado no site."""

    TIPOS = {
        "serra": EsteiraSerraCircular,
        "guilhotina": EsteiraGuilhotina,
        "laminadora": EsteiraLaminadora,
    }

    @classmethod
    def criar(cls, codigo: str, tipo: str) -> Esteira:
        classe = cls.TIPOS.get(tipo, EsteiraSerraCircular)  # tipo desconhecido vira serra
        return classe(codigo)


# ---------------------------------------------------------------------
# ENCAPSULAMENTO: so esta classe sabe falar HTTP com o Node-RED
# ---------------------------------------------------------------------
class ClienteNodeRed:
    def __init__(self, host: str, porta: int = 1880):
        base = f"http://{host}:{porta}"
        self.url = f"{base}/api/eventos"
        self.url_status = f"{base}/api/status-esteiras"

    def enviar(self, leitura: dict) -> dict:
        resposta = requests.post(self.url, json=leitura, timeout=5)
        if resposta.status_code not in (200, 201):
            raise RuntimeError(f"[ERRO {resposta.status_code}] {resposta.text}")
        return resposta.json()

    def buscar_esteiras(self) -> dict:
        """{"esteira1": {"tipo": "serra", "parada": False, ...}, ...}"""
        resposta = requests.get(self.url_status, timeout=5)
        resposta.raise_for_status()
        return resposta.json().get("esteiras", {})


# ---------------------------------------------------------------------
# COMPOSICAO: o simulador e montado com esteiras + cliente
# ---------------------------------------------------------------------
class SimuladorWoodScan:
    INTERVALO_STATUS = 3.0

    def __init__(self, host_node_red: str, porta_node_red: int = 1880,
                 intervalo_min: float = 1.0, intervalo_max: float = 4.0):
        self.cliente = ClienteNodeRed(host_node_red, porta_node_red)
        self.esteiras = {}  # codigo -> objeto Esteira (de qualquer classe filha)
        self.intervalo_min = intervalo_min
        self.intervalo_max = intervalo_max
        self._ultima_consulta = 0.0
        self._avisou_offline = False
        self._avisou_todas_paradas = False

    def sincronizar(self) -> None:
        """Busca as esteiras no Node-RED: cria novas, remove excluidas, atualiza paradas."""
        agora = time.time()
        if agora - self._ultima_consulta < self.INTERVALO_STATUS:
            return
        self._ultima_consulta = agora

        try:
            cadastro = self.cliente.buscar_esteiras()
            self._avisou_offline = False
        except (requests.exceptions.RequestException, ValueError) as erro:
            if not self._avisou_offline:
                print(f"[AVISO] Nao consegui buscar as esteiras ({erro}). Mantendo a lista atual.")
                self._avisou_offline = True
            return

        for codigo, dados in cadastro.items():
            tipo = dados.get("tipo", "serra")
            atual = self.esteiras.get(codigo)

            # esteira nova, ou o tipo mudou: a fabrica cria o objeto da classe certa
            if atual is None or not isinstance(atual, FabricaDeEsteiras.TIPOS.get(tipo, EsteiraSerraCircular)):
                nova = FabricaDeEsteiras.criar(codigo, tipo)
                if atual is not None:
                    nova.pulsos_enviados = atual.pulsos_enviados
                self.esteiras[codigo] = nova
                print(f"[NOVA] {nova} entrou na simulacao.")

            esteira = self.esteiras[codigo]
            parada = bool(dados.get("parada", False))
            if parada and not esteira.parada:
                print(f"[PARADA] {esteira} parada para manutencao - sem novas leituras.")
            elif not parada and esteira.parada:
                print(f"[RETOMADA] {esteira} voltou a produzir.")
            esteira.parada = parada

        for codigo in list(self.esteiras):
            if codigo not in cadastro:
                print(f"[REMOVIDA] {self.esteiras[codigo]} saiu do cadastro.")
                del self.esteiras[codigo]

    def sortear_esteira(self):
        ativas = [e for e in self.esteiras.values() if not e.parada]
        if not ativas:
            return None
        # polimorfismo: cada objeto responde ritmo() conforme a sua classe
        return random.choices(ativas, weights=[e.ritmo() for e in ativas])[0]

    def enviar_leitura(self, esteira: Esteira) -> None:
        leitura = esteira.gerar_leitura()  # polimorfismo: cada classe gera do seu jeito
        try:
            dados = self.cliente.enviar(leitura)
            esteira.registrar_envio()
            print(
                f"[OK] {esteira.codigo} ({esteira.nome_tipo}) -> turno {dados.get('turno')} | "
                f"{leitura['temperatura']}°C | {leitura['umidade']}% | {dados.get('status')}"
            )
        except requests.exceptions.RequestException as erro:
            print(f"[FALHA DE CONEXAO] {esteira.codigo} -> {erro}")
        except RuntimeError as erro:
            print(f"{erro} ({esteira.codigo})")

    def mostrar_resumo(self) -> None:
        print("\nResumo da simulação:")
        for esteira in self.esteiras.values():
            situacao = " (parada)" if esteira.parada else ""
            print(f"  {esteira}: {esteira.pulsos_enviados} pulsos enviados{situacao}")

    def executar(self) -> None:
        print(f"Simulando leituras para o Node-RED em: {self.cliente.url}")
        print("As esteiras vem do cadastro do site. Ctrl+C para parar.\n")
        try:
            while True:
                self.sincronizar()
                esteira = self.sortear_esteira()

                if esteira is None:
                    if not self._avisou_todas_paradas:
                        print("[AVISO] Nenhuma esteira produzindo (paradas ou sem cadastro). Aguardando...")
                        self._avisou_todas_paradas = True
                    time.sleep(self.INTERVALO_STATUS)
                    continue
                self._avisou_todas_paradas = False

                self.enviar_leitura(esteira)
                time.sleep(random.uniform(self.intervalo_min, self.intervalo_max))
        except KeyboardInterrupt:
            print("\nSimulacao encerrada.")
            self.mostrar_resumo()


if __name__ == "__main__":
    NODE_RED_HOST = "10.110.12.79"  # <-- IP do PC onde roda o Node-RED (confira com ipconfig)
    NODE_RED_PORT = 1880

    SimuladorWoodScan(host_node_red=NODE_RED_HOST, porta_node_red=NODE_RED_PORT).executar()
