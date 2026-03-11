import type { I18nMessages } from "../../types"

export const flowModelsMessages: Pick<I18nMessages["flow"], "udmEditor" | "udmModels" | "modelParams"> = {
  udmEditor: {
    form: {
      headingDefault: "UDM Model Editor",
      descriptionDefault:
        "Maintain the Petersen matrix, rate expressions, and parameter ranges, then generate a default flowchart in one click.",
      loading: "Loading model...",
      sections: {
        basicInfo: "Model Basics",
        components: "Components (columns)",
        processes: "Processes (rows) + Stoich + rateExpr",
        parameterWizard: "Parameter Range Wizard",
      },
      placeholders: {
        modelName: "Model name",
        modelDescription: "Model description",
        tags: "Tags, separated by commas",
        clickEditRateExpr: "Click to edit rateExpr",
        stoichExample: "e.g. -1, Y_A, 1/Y_H",
      },
      actions: {
        addComponent: "Add Component",
        clearAllStoich: "Reset All Stoich to 0",
        addProcess: "Add Process",
        addParameter: "Add Parameter",
      },
      columns: {
        name: "name",
        varName: "Var. Name",
        label: "label",
        unit: "unit",
        defaultValue: "default",
        allowChange: "Allow Change",
        actions: "Actions",
        processName: "process name",
        rateExpr: "rateExpr",
        note: "note",
        description: "Description",
        min: "min",
        max: "max",
        scale: "scale",
      },
      varNameTooltip: "Variable name must be a valid identifier: start with a letter or underscore, contain only letters, digits, and underscores",
      aria: {
        allowChange: "allow-change-{index}",
      },
      rangeErrors: {
        minLessThanMax: "{name}: min must be smaller than max",
        minDefaultMaxOrder: "{name}: require min < default < max",
        logScaleMinPositive: "{name}: min must be > 0 for log scale",
      },
      toast: {
        modelNameRequired: "Model name cannot be empty",
        saveSuccess: "Model saved successfully",
        saveFailed: "Failed to save model",
        missingVersionForFlow:
          "Model has no version data and cannot generate flowchart",
        generateFlowSuccess: "Default flowchart generated and applied",
        generateFlowFailed: "Failed to generate flowchart",
      },
      confirm: {
        unsavedChangesLeave:
          "You have unsaved changes. Leave this page anyway?",
      },
      flowchart: {
        autoDescription: "Auto generated from UDM model editor",
      },
      defaults: {
        unnamedModel: "Unnamed UDM Model",
        influentNode: "Influent",
        reactorNode: "UDM Reactor",
        effluentNode: "Effluent",
        defaultFlowSuffix: "-default-flow",
      },
    },
    validation: {
      sectionTitle: "Model Validation & Parameter Extraction",
      actions: {
        parseValidate: "Parse / Validate",
        applyExtractedParams: "Apply Extracted Parameters",
      },
      status: {
        passed: "Validation passed",
        failed: "Validation failed",
      },
      extractedLabel: "extracted:",
      jumpToCellTitle: "Click to jump to target process / stoich cell",
      emptyHint:
        'Click "Parse / Validate" to view errors, warnings, and extracted parameters.',
      toast: {
        validationPassed: "Model definition validation passed",
        validationHasIssues:
          "Model definition has issues. Please fix them before saving.",
        validationFailed: "Validation failed",
        noExtractedParameters: "No extracted parameters to apply",
        parametersMerged: "Parameter table updated from extracted parameters",
      },
    },
    status: {
      unsaved: "Unsaved changes",
      saved: "Saved",
    },
    actions: {
      saveModel: "Save Model",
      saveAndGenerateFlow: "Save and Generate Default Flowchart",
      backToLibrary: "Back to Model Library",
      openModelEditor: "UDM Model Editor",
    },
    dialog: {
      title: "UDM Model Editor",
      formDescription:
        "Edit the model in this dialog. After saving, you can directly apply the default flowchart.",
      activeModelId: "Current Model ID: {id}",
      newMode: "Creating a new model",
      actions: {
        newBlankModel: "Create Blank Model",
        editBoundModel: "Edit Bound Model",
        applyToCurrentNode: "Apply to Current UDM Node",
        applyToAllNodes: "Apply to All UDM Nodes",
      },
      toast: {
        saveBeforeApply: "Save the model before applying it to nodes",
        missingVersion:
          "Current model has no version data and cannot be applied",
        appliedToCurrent: "Applied to current UDM node",
        appliedToAll: "Applied to all UDM nodes",
      },
    },
    expressionEditor: {
      title: {
        rateExpr: "Edit rateExpr - Process {processIndex}",
        stoich: "Edit stoich - Process {processIndex} / {componentName}",
      },
      processFallback: "process_{processIndex}",
      heading: "Expression Editor",
      emptyHint: "Enter expression, e.g. u_H*(S_S/(K_S+S_S))*X_BH",
      shortcuts: {
        save: "Ctrl/Cmd + Enter to save",
        cancel: "Esc to cancel",
      },
      validation: {
        heading: "Real-time Validation (Warning only)",
        noIssues: "No obvious issues found.",
        emptyExpression:
          "Expression is empty. Save is allowed but backend validation may fail.",
        unmatchedRightParen: "Unmatched right parenthesis ')'.",
        unmatchedLeftParen: "Unmatched left parenthesis '('.",
        unknownChar: "Invalid character(s): {symbols}",
        unknownSymbol: "Unknown symbol(s): {symbols}",
        stoichComponentRef:
          "Stoich expression references component(s): {symbols}",
        missingOperatorBetweenSymbols:
          "Detected adjacent symbols separated only by spaces: {pairs}. Add an operator (for example *, +, -, /).",
        unknownIssue: "Unrecognized validation issue: {code}",
      },
      variables: {
        title: "Variables",
        empty: "No variables available.",
      },
      parameters: {
        title: "Parameters",
        empty: "No parameters available.",
      },
      functions: {
        title: "Functions",
      },
      constants: {
        title: "Constants",
      },
      aria: {
        insertVariable: "Insert variable {name}",
        insertParameter: "Insert parameter {name}",
        insertFunction: "Insert function {name}",
        insertConstant: "Insert constant {name}",
      },
    },
  },
  udmModels: {
    title: "UDM Model Library",
    searchPlaceholder: "Search by model name",
    actions: {
      search: "Search",
      clear: "Clear",
      createBlankModel: "Create Blank Model",
      createFromTemplate: "Create from Template",
      edit: "Edit",
      duplicate: "Duplicate",
      publish: "Publish",
      unpublish: "Unpublish",
      delete: "Delete",
    },
    sections: {
      templateQuickCreate: "Template Quick Create",
      myModels: "My Models",
    },
    state: {
      templatesLoading: "Loading templates...",
      templatesEmpty: "No templates available",
      modelsLoading: "Loading models...",
      modelsEmptyTitle: "No models found",
      modelsEmptyDescription:
        "Create a blank model or generate one from template.",
    },
    template: {
      noDescription: "No description",
      stats:
        "Components: {components} | Processes: {processes} | Parameters: {parameters}",
    },
    table: {
      headers: {
        modelName: "Model Name",
        version: "Version",
        publishStatus: "Publish Status",
        updatedAt: "Updated At",
        actions: "Actions",
      },
      published: "Published",
      unpublished: "Draft",
    },
    toast: {
      createTemplateSuccess: "Template model created: {name}",
      createTemplateFailed: "Failed to create model from template",
      duplicateSuccess: "Model duplicated: {name}",
      duplicateFailed: "Failed to duplicate model",
      deleteSuccess: "Model deleted",
      deleteFailed: "Failed to delete model",
      publishSuccess: "Model published",
      unpublishSuccess: "Model unpublished",
      publishUpdateFailed: "Failed to update publish status",
    },
    confirm: {
      deleteTitle: "Confirm Delete",
      deleteModel: 'Delete model "{name}"? This action cannot be undone.',
    },
    pagination: {
      prev: "Previous",
      next: "Next",
      info: "Page {current} / {total}",
    },
  },
  modelParams: {
    asm1slim: {
      volume: {
        label: "Volume (m3)",
        description: "Reactor volume, unit: m3",
      },
      aerobicCODDegradationRate: {
        label: "Aerobic COD degradation rate",
        description: "COD degradation rate constant under aerobic conditions",
      },
      ammonia: {
        label: "Ammonia nitrogen",
        description: "Ammonia concentration (mg/L)",
      },
      ammoniaNitrificationInfluence: {
        label: "Ammonia impact on nitrification rate",
        description: "Influence coefficient of ammonia on nitrification rate",
      },
      cod: { label: "COD", description: "Chemical oxygen demand (mg/L)" },
      codDenitrificationInfluence: {
        label: "COD impact on denitrification rate",
        description: "Influence coefficient of COD on denitrification rate",
      },
      dissolvedOxygen: {
        label: "Dissolved oxygen",
        description: "Dissolved oxygen concentration (mg/L)",
      },
      empiricalCNRatio: {
        label: "Empirical C/N ratio",
        description: "Empirical carbon-to-nitrogen ratio",
      },
      empiricalDenitrificationRate: {
        label: "Empirical denitrification rate",
        description: "Empirical denitrification rate constant",
      },
      empiricalNitrificationRate: {
        label: "Empirical nitrification rate",
        description: "Empirical nitrification rate constant",
      },
      nitrate: {
        label: "Nitrate nitrogen",
        description: "Nitrate concentration (mg/L)",
      },
      nitrateDenitrificationInfluence: {
        label: "Nitrate impact on denitrification rate",
        description:
          "Influence coefficient of nitrate on denitrification rate",
      },
      totalAlkalinity: {
        label: "Total alkalinity",
        description: "Total alkalinity (mg/L)",
      },
    },
    asm1: {
      volume: { label: "volume", description: "Reactor volume, unit: m3" },
      K_NH: {
        label: "K_NH",
        description: "Half-saturation constant for ammonia (g NH3-N/m3)",
      },
      K_NO: {
        label: "K_NO",
        description: "Half-saturation constant for nitrate (g NO3-N/m3)",
      },
      K_OA: {
        label: "K_OA",
        description: "Half-saturation constant for oxygen (g O2/m3)",
      },
      K_OH: {
        label: "K_OH",
        description: "Half-saturation constant for oxygen (g O2/m3)",
      },
      K_S: {
        label: "K_S",
        description:
          "Half-saturation constant for readily biodegradable substrate (g COD/m3)",
      },
      K_a: {
        label: "K_a",
        description:
          "Maximum ammonification rate for organic nitrogen (m3/(g COD*d))",
      },
      K_h: {
        label: "K_h",
        description: "Maximum hydrolysis rate (g COD/(X_S)/(g COD*d))",
      },
      K_x: {
        label: "K_x",
        description:
          "Half-saturation for hydrolysis of slowly biodegradable substrate (g COD(Xs)/g COD)",
      },
      S_ALK: { label: "S_ALK", description: "Alkalinity (mol HCO3-/L)" },
      S_ND: {
        label: "S_ND",
        description: "Soluble organic nitrogen concentration (mg N/L)",
      },
      S_NH: { label: "S_NH", description: "Ammonia concentration (mg N/L)" },
      S_NO: { label: "S_NO", description: "Nitrate concentration (mg N/L)" },
      S_O: {
        label: "S_O",
        description: "Dissolved oxygen concentration (mg O2/L)",
      },
      S_S: {
        label: "S_S",
        description:
          "Readily biodegradable substrate concentration (mg COD/L)",
      },
      X_BA: {
        label: "X_BA",
        description: "Autotrophic biomass concentration (mg COD/L)",
      },
      X_BH: {
        label: "X_BH",
        description: "Heterotrophic biomass concentration (mg COD/L)",
      },
      X_ND: {
        label: "X_ND",
        description: "Particulate organic nitrogen concentration (mg N/L)",
      },
      X_S: {
        label: "X_S",
        description:
          "Slowly biodegradable substrate concentration (mg COD/L)",
      },
      X_i: {
        label: "X_i",
        description: "Inert particulate matter concentration (mg COD/L)",
      },
      Y_A: {
        label: "Y_A",
        description:
          "Biomass COD formed per g NH3-N oxidized (COD(cell)/g N oxidized)",
      },
      Y_H: {
        label: "Y_H",
        description:
          "Biomass COD formed per g COD oxidized (g COD(cell)/g COD oxidized)",
      },
      b_A: { label: "b_A", description: "Autotrophic decay rate (1/d)" },
      b_H: { label: "b_H", description: "Heterotrophic decay rate (1/d)" },
      f_P: {
        label: "f_P",
        description:
          "Fraction of biomass converted to inert particulates upon decay",
      },
      i_XB: {
        label: "i_XB",
        description: "Nitrogen content per COD of biomass (g N/g COD(cell))",
      },
      i_XP: {
        label: "i_XP",
        description:
          "Nitrogen content per COD of decay products (g N/g COD decay products)",
      },
      n_g: {
        label: "n_g",
        description: "Anoxic correction factor (dimensionless)",
      },
      n_h: {
        label: "n_h",
        description: "Anoxic hydrolysis correction factor (dimensionless)",
      },
      u_A: { label: "u_A", description: "Max autotrophic growth rate (1/d)" },
      u_H: {
        label: "u_H",
        description: "Max heterotrophic growth rate (1/d)",
      },
    },
    asm3: {
      volume: { label: "volume", description: "Reactor volume, unit: m3" },
      K_ALKA: {
        label: "K_ALKA",
        description: "Alkalinity half-saturation constant (mmol/L)",
      },
      K_ALKH: {
        label: "K_ALKH",
        description: "Alkalinity half-saturation constant (mmol/L)",
      },
      K_AO2: {
        label: "K_AO2",
        description: "Oxygen inhibition constant (mg O2/L)",
      },
      K_NH4A: {
        label: "K_NH4A",
        description: "Ammonia half-saturation constant (mg N/L)",
      },
      K_NH4H: {
        label: "K_NH4H",
        description: "Ammonia half-saturation constant (mg N/L)",
      },
      K_NO: {
        label: "K_NO",
        description: "NOx half-saturation constant (mg N/L)",
      },
      K_O2A: {
        label: "K_O2A",
        description: "Oxygen half-saturation constant (mg O2/L)",
      },
      K_O2H: {
        label: "K_O2H",
        description: "Oxygen half-saturation constant (mg O2/L)",
      },
      K_S: {
        label: "K_S",
        description: "Soluble substrate half-saturation constant (mg COD/L)",
      },
      K_STO_H: {
        label: "K_STO_H",
        description:
          "Storage product half-saturation constant (mg COD/mg COD)",
      },
      K_X: {
        label: "K_X",
        description: "Hydrolysis half-saturation constant (mg COD/mg COD)",
      },
      S_ALK: {
        label: "S_ALK",
        description: "Alkalinity concentration (mmol/L)",
      },
      S_I: {
        label: "S_I",
        description: "Soluble inert organic concentration (mg COD/L)",
      },
      S_ND: {
        label: "S_ND",
        description: "Soluble organic nitrogen concentration (mg N/L)",
      },
      S_NH: { label: "S_NH", description: "NH4-N concentration (mg N/L)" },
      S_NO: { label: "S_NO", description: "NOx-N concentration (mg N/L)" },
      S_O: {
        label: "S_O",
        description: "Dissolved oxygen concentration (mg O2/L)",
      },
      S_S: {
        label: "S_S",
        description: "Soluble organic substrate concentration (mg COD/L)",
      },
      X_A: {
        label: "X_A",
        description: "Autotrophic biomass concentration (mg COD/L)",
      },
      X_H: {
        label: "X_H",
        description: "Heterotrophic biomass concentration (mg COD/L)",
      },
      X_I: {
        label: "X_I",
        description: "Particulate inert organic concentration (mg COD/L)",
      },
      X_ND: {
        label: "X_ND",
        description: "Particulate organic nitrogen concentration (mg N/L)",
      },
      X_S: {
        label: "X_S",
        description:
          "Particulate biodegradable substrate concentration (mg COD/L)",
      },
      X_STO: {
        label: "X_STO",
        description:
          "Intracellular storage products concentration (mg COD/L)",
      },
      Y_A: {
        label: "Y_A",
        description: "Autotrophic yield coefficient (mg COD/mg N)",
      },
      Y_HNOX: {
        label: "Y_HNOX",
        description: "Anoxic heterotrophic yield coefficient (mg COD/mg COD)",
      },
      Y_HO2: {
        label: "Y_HO2",
        description:
          "Aerobic heterotrophic yield coefficient (mg COD/mg COD)",
      },
      Y_STONOX: {
        label: "Y_STONOX",
        description: "Anoxic storage yield coefficient (mg COD/mg COD)",
      },
      Y_STOO2: {
        label: "Y_STOO2",
        description: "Aerobic storage yield coefficient (mg COD/mg COD)",
      },
      b_ANOX: {
        label: "b_ANOX",
        description: "Anoxic decay rate of autotrophs (d-1)",
      },
      b_AO2: {
        label: "b_AO2",
        description: "Aerobic decay rate of autotrophs (d-1)",
      },
      b_HNOX: {
        label: "b_HNOX",
        description: "Anoxic decay rate of heterotrophs (d-1)",
      },
      b_HO2: {
        label: "b_HO2",
        description: "Aerobic decay rate of heterotrophs (d-1)",
      },
      b_STONOX: {
        label: "b_STONOX",
        description: "Anoxic oxidation rate of storage products (d-1)",
      },
      b_STOO2: {
        label: "b_STOO2",
        description: "Aerobic oxidation rate of storage products (d-1)",
      },
      f_SI: {
        label: "f_SI",
        description:
          "Fraction of inert soluble products from hydrolysis (mg COD/mg COD)",
      },
      f_XI: {
        label: "f_XI",
        description:
          "Fraction of inert particulate products from decay (mg COD/mg COD)",
      },
      i_NBM: {
        label: "i_NBM",
        description: "Nitrogen content of biomass (mg N/mg COD)",
      },
      i_NSI: {
        label: "i_NSI",
        description: "Nitrogen content of soluble inert matter (mg N/mg COD)",
      },
      i_NSS: {
        label: "i_NSS",
        description: "Nitrogen content of soluble substrate (mg N/mg COD)",
      },
      i_NXI: {
        label: "i_NXI",
        description: "Nitrogen content of particulate inert (mg N/mg COD)",
      },
      i_NXS: {
        label: "i_NXS",
        description:
          "Nitrogen content of particulate substrate (mg N/mg COD)",
      },
      i_SSBM: {
        label: "i_SSBM",
        description: "TSS content of biomass (mg TSS/mg COD)",
      },
      i_SSSTO: {
        label: "i_SSSTO",
        description: "TSS content of storage products (mg TSS/mg COD)",
      },
      i_SSXI: {
        label: "i_SSXI",
        description: "TSS content of particulate inert (mg TSS/mg COD)",
      },
      k_H: {
        label: "k_H",
        description:
          "Hydrolysis rate constant for particulate substrate (d-1)",
      },
      k_STO: {
        label: "k_STO",
        description: "Formation rate constant of storage products (d-1)",
      },
      k_a: {
        label: "k_a",
        description: "Ammonification rate constant (m3/(g COD*d))",
      },
      mu_A: {
        label: "mu_A",
        description: "Max autotrophic growth rate (d-1)",
      },
      mu_H: {
        label: "mu_H",
        description: "Max heterotrophic growth rate (d-1)",
      },
      ny_NOX: { label: "ny_NOX", description: "Anoxic correction factor" },
    },
  },
}
