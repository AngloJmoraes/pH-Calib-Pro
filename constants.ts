
export const SECTORS = [
  'Automação, Energia e Engenharia',
  'Processo / Qualidade',
  'Operação de Usina',
  'Manutenção de Usina'
];

export const CALIBRATION_MOTIVES = [
  'Manutenção Preditiva',
  'Manutenção Corretiva',
  'Pedido de Processo'
];

export const SOLUTION_TYPES = ['pH 7,00', 'pH 10,00'];

export const NORMATIVE_REF_DEFAULT = 'ITE-0010-86-30003';

export const TOLERANCE_PERCENTAGE = 2.0;

/**
 * Mapa de correlação automática entre Tag do Analisador e Tag do Equipamento
 */
export const TAG_CORRELATION: Record<string, string> = {
  'AIT-0413-004A': '0413-CF-002',
  'AIT-0413-003': '0413-CF-001',
  'AIT-0413-004': '0413-CF-002',
  'AIT-0417-001': '0417-ES-002',
  'AIT-0417-007': '0417-ES-001',
  'AIT-0413-003A': '0413-CF-001',
};

/**
 * Retorna a sensibilidade teórica (Slope) em mV/pH para uma dada temperatura.
 * Fórmula solicitada: Slope_teorico = 59,16 * (Temp + 273,15) / 298,15
 */
export const getTheoreticalSlope = (tempCelsius: number): number => {
  return 59.16 * (tempCelsius + 273.15) / 298.15;
};

/**
 * Calcula os valores de pH esperados (amostras corrigidas) baseados nas equações técnicas:
 * pH 7: Y = 0.0001X^2 - 0.008X + 7.1376
 * pH 10: Y = -0.026X + 10.65
 * @param temp Temperatura em Graus Celsius (X)
 */
export const getPhFromTemp = (temp: number) => {
  // Garantir que a temperatura esteja dentro do range operacional para as equações (15-45)
  const x = Math.max(15, Math.min(45, temp));

  // Equação para pH 7 (Quadrática)
  const ph7 = (0.0001 * Math.pow(x, 2)) - (0.008 * x) + 7.1376;
  
  // Equação para pH 10 (Linear)
  const ph10 = (-0.026 * x) + 10.65;

  return {
    ph7: parseFloat(ph7.toFixed(2)),
    ph10: parseFloat(ph10.toFixed(2))
  };
};
