import type { I18nMessages } from "../../types"

export const flowTutorialMessages: Pick<I18nMessages["flow"], "tutorial"> = {
  tutorial: {
    sectionTitle: "Petersen Matrix Tutorial",
    sectionSubtitle:
      "From intuitive understanding to online simulation — master activated sludge models step by step",
    continueLearning: "Continue Learning",
    startLearning: "Start Learning",
    viewAnswer: "View Answer",
    runCase: "Run Case",
    comingSoon: "Coming Soon",
    prerequisite: "Requires: {name}",
    completed: "Completed",
    currentStep: "Current step: {step}",
    minutes: "{n} min",
    stepLabel: "Step {step}",
    modeDescription:
      "Guided mode reveals the editor in the same order as the lesson.",
    mode: {
      guided: "Guided",
      expert: "Expert",
    },
    modeToggle: "Toggle tutorial editor mode",
    guide: {
      chapterLabel: "Current chapter",
      objectivesTitle: "Objectives",
      currentStepTitle: "Step {step} focus",
      focusAreas: "Focus areas",
      watchTitle: "Common pitfalls",
    },
    focusAreas: {
      components: "components",
      processes: "processes",
      stoich: "stoichiometry",
      rateExpr: "rate expressions",
      parameters: "parameters",
      validation: "validation",
    },
    processHelp: "Explain this process",
    continuity: {
      sectionTitle: "Continuity Check",
      dimensionLabels: {
        COD: "COD Conservation",
        N: "N Conservation",
        ALK: "ALK Conservation",
      },
      statusLabels: {
        pass: "Pass",
        warn: "Warning",
        error: "Error",
      },
      emptyHint:
        "Continuity check results will appear after clicking Validate",
      jumpToProcess: "Jump to process",
      balanceLabel: "Balance value",
      explanationLabel: "Explanation",
      suggestionLabel: "Suggestion",
      teachingHints: {
        whyFailed: "Why is it imbalanced?",
        howToFix: "How to fix?",
        reference: "See related chapter",
      },
    },
    recipeBar: {
      title: "Recipe snippets",
    },
    recipes: {
      monodSubstrate: {
        label: "Monod substrate term",
        description: "Insert a substrate-limited Monod expression.",
      },
      oxygenSwitch: {
        label: "Oxygen switch",
        description: "Insert an aerobic oxygen limitation term.",
      },
      yieldConsumption: {
        label: "Yield-based consumption",
        description:
          "Insert the classic heterotroph substrate consumption factor.",
      },
      alkBalance: {
        label: "Alkalinity balance",
        description: "Insert a simple alkalinity conversion factor.",
      },
    },
    difficulty: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      full: "Full",
    },
    templateType: {
      exercise: "Exercise",
      answer: "Answer",
      case: "Case",
      guide: "Guide",
    },
    chapters: {
      "chapter-1": {
        title: "Ledger Intuition: Arrow Matrix",
        subtitle:
          "Understand what increases and decreases in a reaction process",
      },
      "chapter-2": {
        title: "Your First Real Matrix",
        subtitle: "Understand Y_H yield coefficient and Monod kinetics",
      },
      "chapter-3": {
        title: "Continuity Check: COD/N Reconciliation",
        subtitle:
          "Learn to verify matrix correctness with conservation principles",
      },
      "chapter-7": {
        title: "Basic CSTR Simulation",
        subtitle: "From matrix to a runnable simulation model",
      },
    },
    lessonContent: {
      "chapter-1": {
        objectives: {
          0: "Recognize components as species and processes as transformations.",
          1: "Read a stoichiometric sign table before editing any formulas.",
        },
        steps: {
          1: {
            title: "List the actors",
            body: "Confirm the components and process names before touching any numbers. The goal is to understand who participates in the reaction.",
          },
          2: {
            title: "Read the arrows",
            body: "Use the sign-only matrix to tell which components are consumed or produced in each process.",
          },
          3: {
            title: "Preview rate expressions",
            body: "This chapter keeps rate formulas closed. Skim the placeholder so you know where kinetics will appear later.",
          },
          4: {
            title: "Preview parameters",
            body: "Parameters stay locked here. Notice where they will be extracted once expressions become richer.",
          },
          5: {
            title: "Preview validation",
            body: "Validation also stays for later chapters. The important outcome here is learning the matrix reading habit.",
          },
        },
        processes: {
          aerobic_cod_removal: {
            title: "Aerobic COD removal",
            story:
              "Heterotrophs consume soluble substrate and oxygen, then convert part of it into biomass.",
            mistakes: {
              0: "If substrate and biomass point in the same direction, you are probably describing accumulation instead of growth.",
            },
          },
        },
      },
      "chapter-2": {
        objectives: {
          0: "Fill a complete aerobic heterotrophic growth row.",
          1: "Connect Monod kinetics to the process meaning.",
          2: "Extract reusable kinetic parameters instead of hard-coding constants.",
        },
        steps: {
          1: {
            title: "Start from the template",
            body: "Check the preloaded components and processes, then decide which row represents heterotrophic growth.",
          },
          2: {
            title: "Balance the stoichiometry",
            body: "Use negative terms for what the process consumes and positive terms for what it creates. Y_H usually appears in the biomass/substrate pair.",
          },
          3: {
            title: "Compose the rate law",
            body: "Build the kinetic term from growth rate, substrate availability, and oxygen availability.",
          },
          4: {
            title: "Promote constants to parameters",
            body: "Move constants like mu_H, K_S, K_OH, and Y_H into the parameter table so the model stays reusable.",
          },
          5: {
            title: "Validate the lesson",
            body: "Run validation, fix any naming or expression errors, and reach a clean pass on the full row.",
          },
        },
        processes: {
          aerobic_cod_removal: {
            title: "Aerobic heterotrophic growth",
            story:
              "This row represents aerobic heterotrophic growth: substrate and oxygen go down, biomass goes up.",
            mistakes: {
              0: "A positive substrate coefficient means the process is generating food instead of consuming it.",
              1: "Leaving Y_H only inside the rate law hides the mass relationship that the matrix is supposed to teach.",
            },
          },
          nitrification: {
            title: "Nitrification",
            story:
              "Autotrophs oxidize ammonia under aerobic conditions and generate nitrate.",
            mistakes: {
              0: "If nitrification does not consume oxygen, the process meaning is incomplete.",
            },
          },
        },
      },
      "chapter-3": {
        objectives: {
          0: "Check COD and nitrogen continuity across multiple processes.",
          1: "Compare aerobic and anoxic pathways without losing sign discipline.",
          2: "Use validation feedback to jump directly to the broken cell.",
        },
        steps: {
          1: {
            title: "Map the nitrogen story",
            body: "Identify which rows move ammonia toward nitrate and which rows remove nitrate under anoxic conditions.",
          },
          2: {
            title: "Complete the stoichiometry",
            body: "Use the matrix to encode COD, oxygen, ammonia, nitrate, and alkalinity directions together.",
          },
          3: {
            title: "Layer the kinetics",
            body: "Add substrate, nitrate, and switching terms without mixing up the biological meaning.",
          },
          4: {
            title: "Parameterize for comparison",
            body: "Pull shared constants into the parameter list so aerobic and anoxic rows can be tuned side by side.",
          },
          5: {
            title: "Close with continuity checks",
            body: "Run validation and use issue jumps to repair any broken symbols or malformed cells.",
          },
        },
        processes: {
          anoxic_denitrification: {
            title: "Anoxic denitrification",
            story:
              "Under anoxic conditions, heterotrophs use nitrate as the electron acceptor while consuming substrate.",
            mistakes: {
              0: "If oxygen still activates the rate, the row is not truly anoxic.",
            },
          },
          nitrification: {
            title: "Nitrification",
            story:
              "Nitrification converts ammonia to nitrate and usually reduces alkalinity.",
            mistakes: {
              0: "Mixing ammonia and nitrate signs is the fastest way to break nitrogen continuity.",
              1: "If alkalinity never changes, the nitrification row is missing an important teaching signal.",
            },
          },
        },
      },
      "chapter-7": {
        objectives: {
          0: "Inspect the full tutorial-ready seed model before simulation.",
          1: "Connect matrix structure, parameters, and validation to a runnable CSTR case.",
        },
        steps: {
          1: {
            title: "Inspect the reactor state",
            body: "Review the tutorial seed and confirm the species and processes that will enter the CSTR case.",
          },
          2: {
            title: "Review the stoichiometry",
            body: "Check the row directions before the simulation chapter opens for editing.",
          },
          3: {
            title: "Review the kinetics",
            body: "Inspect the prepared rate expressions and note how switching terms map to reactor behavior.",
          },
          4: {
            title: "Review the parameter set",
            body: "Check the seed parameters that will drive the first simulation scenario.",
          },
          5: {
            title: "Prepare for simulation",
            body: "Use validation to make sure the seed is consistent before the simulation walkthrough lands.",
          },
        },
        processes: {
          aerobic_growth: {
            title: "Aerobic Heterotrophic Growth",
            story:
              "Heterotrophic bacteria consume soluble substrate (S_S) and dissolved oxygen (S_O) under aerobic conditions, converting substrate into biomass (X_BH). The rate follows dual Monod kinetics.",
            mistakes: {
              0: "If S_O is not consumed, the oxygen stoichiometric coefficient may be missing.",
            },
          },
          decay: {
            title: "Biomass Decay",
            story:
              "Under all conditions, biomass undergoes endogenous respiration decay, converting active biomass into inert particulates and slowly degradable substrate.",
            mistakes: {
              0: "The decay rate should not depend on substrate concentration — it is a first-order process.",
            },
          },
          nitrification: {
            title: "Nitrification (Autotrophic Growth)",
            story:
              "Autotrophic bacteria oxidize ammonia nitrogen (S_NH) to nitrate (S_NO) under aerobic conditions, consuming significant dissolved oxygen.",
            mistakes: {
              0: "Nitrification does not consume organic substrate (S_S). If your rate expression includes S_S, review it.",
            },
          },
        },
      },
    },
    results: {
      panelTitle: "Tutorial Guide",
      noResultHint: "Run the simulation to see recommended charts and learning insights here.",
      unknownLesson: "Unknown lesson",
      recommendedCharts: "Recommended Variables",
      selectVariableHint: "Click a tag above to select variables to observe",
      insightsTitle: "Result Interpretation",
    },
    matrix: {
      title: "Arrow Matrix",
      description:
        "Read the direction of each stoichiometric entry before editing any formulas.",
      processHeader: "Process",
      noneSymbol: "0",
      consumeSymbol: "Consumed",
      produceSymbol: "Produced",
    },
    aliases: {
      templates: {
        asm1: {
          name: "ASM1 Petersen Seed",
          description:
            "Canonical ASM1 seed template for Petersen-matrix modeling.",
        },
        asm1slim: {
          name: "ASM1 Slim Petersen Seed",
          description:
            "Compact ASM1Slim seed template for introductory Petersen-matrix lessons.",
        },
        asm3: {
          name: "ASM3 Petersen Seed",
          description:
            "Canonical ASM3 seed template for Petersen-matrix modeling.",
        },
        "petersen-chapter-1": {
          name: "Chapter 1 Tutorial Seed",
          description:
            "Arrow-matrix starter seed for reading increase/decrease directions.",
        },
        "petersen-chapter-2": {
          name: "Chapter 2 Tutorial Seed",
          description:
            "First full Petersen matrix seed with one complete aerobic growth row.",
        },
        "petersen-chapter-3": {
          name: "Chapter 3 Tutorial Seed",
          description:
            "Continuity-check seed for comparing aerobic and anoxic pathways.",
        },
        "petersen-chapter-7": {
          name: "Chapter 7 Tutorial Seed",
          description:
            "Tutorial-ready ASM1 seed for a basic CSTR simulation case.",
        },
      },
      lessons: {
        "chapter-1": {
          models: {
            default: {
              name: "Chapter 1 Tutorial Seed",
              description:
                "Arrow-matrix starter seed for reading increase/decrease directions.",
            },
          },
          components: {
            dissolvedOxygen: {
              label: "Dissolved Oxygen",
              description: "Aerobic electron acceptor used in oxidation.",
            },
            cod: {
              label: "Organic Substrate (COD)",
              description: "Biodegradable organics represented as COD.",
            },
            nitrate: {
              label: "Nitrate Nitrogen",
              description: "Oxidized nitrogen available for denitrification.",
            },
            ammonia: {
              label: "Ammonia Nitrogen",
              description:
                "Reduced inorganic nitrogen subject to nitrification.",
            },
            totalAlkalinity: {
              label: "Alkalinity",
              description:
                "Buffering capacity affected by nitrification and denitrification.",
            },
          },
          processes: {
            aerobic_cod_removal: {
              label: "Aerobic COD Removal",
              description:
                "Organic substrate is oxidized under aerobic conditions.",
            },
          },
          parameters: {
            aerobicCODDegradationRate: {
              label: "Aerobic COD Rate",
              description: "Empirical aerobic COD degradation coefficient.",
            },
          },
        },
        "chapter-2": {
          models: {
            default: {
              name: "Chapter 2 Tutorial Seed",
              description:
                "First full Petersen matrix seed with one complete aerobic growth row.",
            },
          },
          components: {
            dissolvedOxygen: {
              label: "Dissolved Oxygen",
              description: "Aerobic electron acceptor used in oxidation.",
            },
            cod: {
              label: "Organic Substrate (COD)",
              description: "Biodegradable organics represented as COD.",
            },
            nitrate: {
              label: "Nitrate Nitrogen",
              description: "Oxidized nitrogen available for denitrification.",
            },
            ammonia: {
              label: "Ammonia Nitrogen",
              description:
                "Reduced inorganic nitrogen subject to nitrification.",
            },
            totalAlkalinity: {
              label: "Alkalinity",
              description:
                "Buffering capacity affected by nitrification and denitrification.",
            },
          },
          processes: {
            aerobic_cod_removal: {
              label: "Aerobic Heterotrophic Growth",
              description:
                "COD and oxygen are consumed while biomass-equivalent COD is formed.",
            },
            anoxic_denitrification: {
              label: "Anoxic Denitrification",
              description:
                "COD is consumed while nitrate is reduced under low-oxygen conditions.",
            },
            nitrification: {
              label: "Nitrification",
              description:
                "Ammonia is oxidized to nitrate and alkalinity is consumed.",
            },
          },
          parameters: {
            empiricalDenitrificationRate: {
              label: "Denitrification Rate",
              description: "Empirical denitrification rate coefficient.",
            },
            empiricalNitrificationRate: {
              label: "Nitrification Rate",
              description: "Empirical nitrification rate coefficient.",
            },
            empiricalCNRatio: {
              label: "COD/N Ratio",
              description:
                "Empirical COD demand per unit nitrate reduced.",
            },
            codDenitrificationInfluence: {
              label: "COD Half-Saturation",
              description:
                "COD sensitivity term in denitrification kinetics.",
            },
            nitrateDenitrificationInfluence: {
              label: "Nitrate Half-Saturation",
              description:
                "Nitrate sensitivity term in denitrification kinetics.",
            },
            ammoniaNitrificationInfluence: {
              label: "Ammonia Half-Saturation",
              description: "Ammonia sensitivity term in nitrification kinetics.",
            },
            aerobicCODDegradationRate: {
              label: "Aerobic COD Rate",
              description: "Empirical aerobic COD degradation coefficient.",
            },
          },
        },
        "chapter-3": {
          models: {
            default: {
              name: "Chapter 3 Tutorial Seed",
              description:
                "Continuity-check seed for comparing aerobic and anoxic pathways.",
            },
          },
          components: {
            dissolvedOxygen: {
              label: "Dissolved Oxygen",
              description: "Aerobic electron acceptor used in oxidation.",
            },
            cod: {
              label: "Organic Substrate (COD)",
              description: "Biodegradable organics represented as COD.",
            },
            nitrate: {
              label: "Nitrate Nitrogen",
              description: "Oxidized nitrogen available for denitrification.",
            },
            ammonia: {
              label: "Ammonia Nitrogen",
              description:
                "Reduced inorganic nitrogen subject to nitrification.",
            },
            totalAlkalinity: {
              label: "Alkalinity",
              description:
                "Buffering capacity affected by nitrification and denitrification.",
            },
          },
          processes: {
            aerobic_cod_removal: {
              label: "Aerobic Heterotrophic Growth",
              description:
                "Reference aerobic COD removal row for continuity comparison.",
            },
            anoxic_denitrification: {
              label: "Anoxic Denitrification",
              description:
                "Nitrate is reduced while COD is consumed and alkalinity recovers.",
            },
            nitrification: {
              label: "Nitrification",
              description:
                "Ammonia becomes nitrate and alkalinity drops.",
            },
          },
          parameters: {
            empiricalDenitrificationRate: {
              label: "Denitrification Rate",
              description: "Empirical denitrification rate coefficient.",
            },
            empiricalNitrificationRate: {
              label: "Nitrification Rate",
              description: "Empirical nitrification rate coefficient.",
            },
            empiricalCNRatio: {
              label: "COD/N Ratio",
              description:
                "Empirical COD demand per unit nitrate reduced.",
            },
            codDenitrificationInfluence: {
              label: "COD Half-Saturation",
              description:
                "COD sensitivity term in denitrification kinetics.",
            },
            nitrateDenitrificationInfluence: {
              label: "Nitrate Half-Saturation",
              description:
                "Nitrate sensitivity term in denitrification kinetics.",
            },
            ammoniaNitrificationInfluence: {
              label: "Ammonia Half-Saturation",
              description: "Ammonia sensitivity term in nitrification kinetics.",
            },
            aerobicCODDegradationRate: {
              label: "Aerobic COD Rate",
              description: "Empirical aerobic COD degradation coefficient.",
            },
          },
        },
        "chapter-7": {
          models: {
            default: {
              name: "Chapter 7 Tutorial Seed",
              description:
                "Tutorial-ready ASM1 seed for a basic CSTR simulation case.",
            },
          },
          components: {
            X_BH: {
              label: "Heterotrophic Biomass",
              description: "Active heterotrophic biomass COD.",
            },
            X_BA: {
              label: "Autotrophic Biomass",
              description: "Active autotrophic biomass COD.",
            },
            X_S: {
              label: "Slowly Biodegradable Substrate",
              description: "Particulate biodegradable organic substrate.",
            },
            X_i: {
              label: "Inert Particulate COD",
              description: "Particulate inert organic matter.",
            },
            X_ND: {
              label: "Particulate Organic Nitrogen",
              description: "Particulate biodegradable organic nitrogen.",
            },
            S_O: {
              label: "Dissolved Oxygen",
              description: "Aerobic electron acceptor.",
            },
            S_S: {
              label: "Readily Biodegradable Substrate",
              description: "Soluble biodegradable organic substrate.",
            },
            S_NO: {
              label: "Nitrate Nitrogen",
              description: "Oxidized inorganic nitrogen.",
            },
            S_NH: {
              label: "Ammonia Nitrogen",
              description: "Reduced inorganic nitrogen.",
            },
            S_ND: {
              label: "Soluble Organic Nitrogen",
              description: "Soluble biodegradable organic nitrogen.",
            },
            S_ALK: {
              label: "Alkalinity",
              description:
                "Acid-neutralizing capacity affected by nitrogen conversions.",
            },
          },
          processes: {
            heterotrophic_growth_aerobic: {
              label: "Aerobic Heterotrophic Growth",
              description:
                "Readily biodegradable substrate is oxidized with oxygen and converted into heterotrophic biomass.",
            },
            heterotrophic_growth_anoxic: {
              label: "Anoxic Heterotrophic Growth",
              description:
                "Substrate is consumed while nitrate is reduced under anoxic conditions.",
            },
            autotrophic_growth: {
              label: "Autotrophic Growth",
              description:
                "Autotrophs oxidize ammonia to nitrate under aerobic conditions.",
            },
            heterotrophic_decay: {
              label: "Heterotrophic Decay",
              description:
                "Active heterotroph biomass decays into inert and nitrogen-containing products.",
            },
            autotrophic_decay: {
              label: "Autotrophic Decay",
              description:
                "Active autotroph biomass decays into inert particulate products.",
            },
            ammonification: {
              label: "Ammonification",
              description:
                "Soluble organic nitrogen is converted into ammonia nitrogen.",
            },
            hydrolysis: {
              label: "Hydrolysis",
              description:
                "Slowly biodegradable particulate substrate becomes soluble substrate.",
            },
            hydrolysis_nitrogen: {
              label: "Nitrogen Hydrolysis",
              description:
                "Particulate organic nitrogen becomes soluble organic nitrogen.",
            },
          },
          parameters: {
            u_H: {
              label: "Max Heterotroph Growth Rate",
              description: "Maximum specific growth rate of heterotrophs.",
            },
            K_S: {
              label: "Substrate Half-Saturation",
              description:
                "Half-saturation constant for readily biodegradable substrate.",
            },
            K_OH: {
              label: "Oxygen Half-Saturation (Heterotrophs)",
              description: "Oxygen limitation constant for heterotrophs.",
            },
            K_NO: {
              label: "Nitrate Half-Saturation",
              description:
                "Nitrate limitation constant in anoxic heterotrophic growth.",
            },
            n_g: {
              label: "Anoxic Growth Correction",
              description: "Correction factor for anoxic heterotrophic growth.",
            },
            b_H: {
              label: "Heterotroph Decay Rate",
              description: "First-order decay rate of heterotroph biomass.",
            },
            u_A: {
              label: "Max Autotroph Growth Rate",
              description: "Maximum specific growth rate of autotrophs.",
            },
            K_NH: {
              label: "Ammonia Half-Saturation",
              description:
                "Ammonia limitation constant for autotrophic growth.",
            },
            K_OA: {
              label: "Oxygen Half-Saturation (Autotrophs)",
              description: "Oxygen limitation constant for autotrophs.",
            },
            b_A: {
              label: "Autotroph Decay Rate",
              description: "First-order decay rate of autotroph biomass.",
            },
            Y_H: {
              label: "Heterotroph Yield",
              description:
                "Biomass yield per unit substrate consumed for heterotrophs.",
            },
            Y_A: {
              label: "Autotroph Yield",
              description:
                "Biomass yield per unit ammonia oxidized for autotrophs.",
            },
            i_XB: {
              label: "Biomass Nitrogen Content",
              description: "Nitrogen content of active biomass.",
            },
            i_XP: {
              label: "Particulate Product Nitrogen Content",
              description: "Nitrogen content of particulate products.",
            },
            f_P: {
              label: "Particulate Product Fraction",
              description:
                "Fraction of decayed biomass converted to particulate products.",
            },
            n_h: {
              label: "Anoxic Hydrolysis Correction",
              description: "Correction factor for hydrolysis under anoxic conditions.",
            },
            K_a: {
              label: "Ammonification Rate",
              description:
                "Rate coefficient for converting soluble organic nitrogen to ammonia.",
            },
            K_h: {
              label: "Hydrolysis Rate",
              description:
                "Rate coefficient for hydrolyzing particulate substrate.",
            },
            K_x: {
              label: "Hydrolysis Half-Saturation",
              description:
                "Half-saturation constant for hydrolysis of particulate substrate.",
            },
          },
        },
      },
    },
    insights: {
      "chapter-1": {
        codDecline: {
          title: "Why does COD decline?",
          body: "COD (Chemical Oxygen Demand) represents the concentration of biodegradable organic matter. Under aerobic conditions, microorganisms consume COD as a carbon and energy source. You'll see COD drop quickly at first (fastest when organics are abundant), then gradually slow down — this is the classic Monod kinetics behavior.",
        },
        doConsumption: {
          title: "What does DO consumption indicate?",
          body: "Dissolved oxygen (DO) is essential for aerobic degradation. Microorganisms consume oxygen while oxidizing COD, so the DO decline rate reflects microbial activity intensity. If DO drops to near zero quickly, oxygen consumption exceeds aeration supply — in real operations, this means more aeration is needed.",
        },
      },
      "chapter-2": {
        yieldEffect: {
          title: "How does Y_H affect stoichiometric coefficients?",
          body: "The yield coefficient Y_H represents how much biomass is produced per unit of COD consumed. A higher Y_H means more sludge production and less oxygen consumption per unit COD removed. In the Petersen matrix, many stoichiometric coefficients are functions of Y_H, e.g., oxygen demand is -(1-Y_H)/Y_H. Changing Y_H simultaneously affects the rates of change for multiple components.",
        },
        monodSaturation: {
          title: "Why does degradation slow down?",
          body: "The Monod equation S/(K_S+S) describes how substrate concentration affects degradation rate. When S >> K_S, the rate approaches its maximum (zero-order); when S << K_S, the rate is proportional to S (first-order). The transition from rapid to gradual COD decline is the shift from zero-order to first-order kinetics.",
        },
        nitrificationOnset: {
          title: "When does nitrification start?",
          body: "Nitrifying bacteria (autotrophs) convert ammonia to nitrate. Observe the ammonia curve: if ammonia begins declining early in the simulation, nitrification has started. Nitrification rate is controlled by both dissolved oxygen and ammonia concentration — insufficient DO inhibits nitrification.",
        },
      },
      "chapter-3": {
        aerobicVsAnoxic: {
          title: "Aerobic vs. anoxic pathways",
          body: "COD can be degraded via two pathways: aerobic (using O\u2082 as electron acceptor) and anoxic (using NO\u2083\u207B as electron acceptor, i.e., denitrification). When DO is low, microorganisms switch to using nitrate — this is the principle of denitrification. This chapter sets low DO and high nitrate to observe this switch.",
        },
        nitrogenBalance: {
          title: "Where does the nitrogen go?",
          body: "Observe ammonia and nitrate changes: ammonia is converted to nitrate via nitrification (NH\u2084\u207A \u2192 NO\u2083\u207B), and nitrate is converted to nitrogen gas via denitrification (NO\u2083\u207B \u2192 N\u2082\u2191). If ammonia decreases but nitrate doesn't increase proportionally, some nitrogen has left the system through denitrification.",
        },
        alkalinitySignal: {
          title: "What does alkalinity change tell us?",
          body: "Alkalinity is an indicator of nitrification/denitrification balance. Nitrification consumes alkalinity (~7.14 mg CaCO\u2083 per mg NH\u2084\u207A-N oxidized), while denitrification recovers alkalinity (~3.57 mg CaCO\u2083 per mg NO\u2083\u207B-N reduced). The net alkalinity change helps assess the relative intensity of nitrification vs. denitrification.",
        },
      },
      "chapter-7": {
        ssDeclination: {
          title: "Why does S_S decline over time?",
          body: "Soluble substrate S_S is consumed by heterotrophic bacteria (X_BH). Per Monod kinetics, consumption is fastest when S_S is much greater than K_S, and slows as S_S approaches K_S. This is why the S_S curve typically shows a fast-then-slow decline.",
        },
        xbhGrowth: {
          title: "Why does X_BH grow rapidly then plateau?",
          body: "Heterotrophic growth is limited by S_S concentration. When S_S is abundant initially, X_BH grows quickly; as S_S is depleted, the growth rate drops. When growth and decay rates approach equilibrium, X_BH stabilizes.",
        },
        oxygenDemand: {
          title: "What does S_O change tell us?",
          body: "Dissolved oxygen consumption reflects the oxygen demand of biological reactions. Both aerobic heterotrophic growth and nitrification consume oxygen. If S_O drops to zero quickly, aeration is insufficient or influent loading is too high.",
        },
        nitrification: {
          title: "Inverse trends of S_NH and S_NO",
          body: "Nitrification converts ammonia (S_NH) to nitrate (S_NO), so S_NH decreases while S_NO increases. If S_O is insufficient, nitrification is inhibited and S_NH may not be fully converted.",
        },
      },
    },
    explosionDebug: {
      alertTitle: "Numerical Anomaly Detected",
      checklistTitle: "Debug Checklist",
      items: {
        checkInitialValues: "Check initial values: Are there denominator terms with concentration = 0? (e.g., K_S=0 causes division by zero)",
        checkStoichiometry: "Check stoichiometric coefficients: Are signs correct? (consumption is negative, production is positive)",
        reduceStepSize: "Try reducing step size: increase steps_per_hour (e.g., from 20 to 100)",
        checkVolume: "Check reactor volume: Is it too small relative to flow? (Small volume causes rapid dilution)",
        checkRateExpressions: "Verify rate expressions: Are all Monod half-saturation constants K > 0?",
      },
    },
    completion: {
      congratsTitle: "Chapter Complete!",
      congratsBody: "You have successfully completed the full loop from matrix definition to simulation.",
      markComplete: "Mark Complete",
      nextChapter: "Next Chapter",
      alreadyCompleted: "This chapter is already completed",
    },
  },
}
