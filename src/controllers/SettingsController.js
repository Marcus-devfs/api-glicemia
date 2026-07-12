const {
  getAppSettings,
  updateAppSettings,
} = require("../lib/appSettings");
const { getAsaasMinCharge } = require("../lib/asaas/limits");
const { isSandbox } = require("../lib/asaas/client");

class SettingsController {
  /** Público — app lê preço premium e limite de PDFs grátis */
  getPremiumSettings = async (_req, res) => {
    try {
      const settings = await getAppSettings();
      res.status(200).json({
        premiumPrice: settings.premiumPrice,
        freePdfLimit: settings.freePdfLimit,
      });
    } catch (error) {
      console.log("getPremiumSettings error:", error);
      res.status(500).json({ msg: "Erro ao carregar configurações" });
    }
  };

  /** Admin — inclui updatedAt */
  getPremiumSettingsAdmin = async (_req, res) => {
    try {
      const settings = await getAppSettings();
      res.status(200).json({
        ...settings,
        asaasMinCharge: getAsaasMinCharge(),
        asaasSandbox: isSandbox(),
      });
    } catch (error) {
      res.status(500).json({ msg: "Erro ao carregar configurações" });
    }
  };

  updatePremiumSettings = async (req, res) => {
    try {
      const { premiumPrice, freePdfLimit } = req.body;

      if (premiumPrice != null) {
        const price = Number(premiumPrice);
        const minCharge = getAsaasMinCharge();
        if (!Number.isFinite(price) || price < minCharge || price > 999.99) {
          return res.status(400).json({
            msg: `Informe um preço entre R$ ${minCharge.toFixed(2).replace(".", ",")} e R$ 999,99 (mínimo do Asaas${isSandbox() ? " sandbox" : " em produção"})`,
          });
        }
      }

      if (freePdfLimit != null) {
        const limit = Math.round(Number(freePdfLimit));
        if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
          return res.status(400).json({
            msg: "Limite de PDFs grátis deve ser entre 1 e 100",
          });
        }
      }

      if (premiumPrice == null && freePdfLimit == null) {
        return res.status(400).json({ msg: "Nada para atualizar" });
      }

      const settings = await updateAppSettings({ premiumPrice, freePdfLimit });
      res.status(200).json({
        ...settings,
        asaasMinCharge: getAsaasMinCharge(),
        asaasSandbox: isSandbox(),
      });
    } catch (error) {
      console.log("updatePremiumSettings error:", error);
      res.status(500).json({ msg: "Erro ao salvar configurações" });
    }
  };
}

module.exports = new SettingsController();
