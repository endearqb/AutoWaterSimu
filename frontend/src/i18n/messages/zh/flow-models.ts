import type { I18nMessages } from "../../types"

export const flowModelsMessages: Pick<I18nMessages["flow"], "udmEditor" | "udmModels" | "modelParams"> = {
  udmEditor: {
    form: {
      headingDefault: "UDM 模型编辑器",
      descriptionDefault:
        "在此维护 Petersen 矩阵、速率表达式、参数范围，并一键生成默认画布。",
      loading: "模型加载中...",
      sections: {
        basicInfo: "模型基础信息",
        components: "Components（列）",
        processes: "Processes（行）+ Stoich + rateExpr",
        parameterWizard: "参数范围向导",
      },
      placeholders: {
        modelName: "模型名称",
        modelDescription: "模型描述",
        tags: "标签，逗号分隔",
        clickEditRateExpr: "点击编辑 rateExpr",
        stoichExample: "例如：-1, Y_A, 1/Y_H",
      },
      actions: {
        addComponent: "新增 Component",
        clearAllStoich: "Stoich 全部清零",
        addProcess: "新增 Process",
        addParameter: "新增参数",
      },
      columns: {
        name: "name",
        label: "label",
        unit: "unit",
        defaultValue: "default",
        allowChange: "允许变化",
        actions: "操作",
        processName: "process name",
        rateExpr: "rateExpr",
        note: "note",
        min: "min",
        max: "max",
        scale: "scale",
      },
      aria: {
        allowChange: "允许变化-{index}",
      },
      rangeErrors: {
        minLessThanMax: "{name}: min 必须小于 max",
        minDefaultMaxOrder: "{name}: 需满足 min < default < max",
        logScaleMinPositive: "{name}: log scale 下 min 必须大于 0",
      },
      toast: {
        modelNameRequired: "模型名称不能为空",
        saveSuccess: "模型保存成功",
        saveFailed: "模型保存失败",
        missingVersionForFlow: "模型没有版本数据，无法生成画布",
        generateFlowSuccess: "已生成并应用默认画布",
        generateFlowFailed: "生成画布失败",
      },
      confirm: {
        unsavedChangesLeave: "存在未保存改动，确认离开当前页面吗？",
      },
      flowchart: {
        autoDescription: "由 UDM 模型编辑器自动生成",
      },
      defaults: {
        unnamedModel: "未命名 UDM 模型",
        influentNode: "进水",
        reactorNode: "UDM 反应器",
        effluentNode: "出水",
        defaultFlowSuffix: "-默认流程图",
      },
    },
    validation: {
      sectionTitle: "模型校验与参数抽取",
      actions: {
        parseValidate: "解析 / 校验",
        applyExtractedParams: "应用抽取参数",
      },
      status: {
        passed: "校验通过",
        failed: "校验失败",
      },
      extractedLabel: "extracted:",
      jumpToCellTitle: "点击跳转到对应 process / stoich 单元格",
      emptyHint: "点击「解析 / 校验」后查看错误、警告和抽取参数。",
      toast: {
        validationPassed: "模型定义校验通过",
        validationHasIssues: "模型定义存在问题，请修正后再保存",
        validationFailed: "校验失败",
        noExtractedParameters: "当前没有可应用的抽取参数",
        parametersMerged: "已按抽取结果补齐参数表",
      },
    },
    status: {
      unsaved: "有未保存变更",
      saved: "已保存",
    },
    actions: {
      saveModel: "保存模型",
      saveAndGenerateFlow: "保存并生成默认画布",
      backToLibrary: "返回模型库",
      openModelEditor: "UDM 模型编辑器",
    },
    dialog: {
      title: "UDM 模型编辑器",
      formDescription: "在弹窗中编辑模型，保存后可直接应用默认画布。",
      activeModelId: "当前模型ID: {id}",
      newMode: "当前为新建模式",
      actions: {
        newBlankModel: "新建空白模型",
        editBoundModel: "编辑当前绑定模型",
        applyToCurrentNode: "应用到当前UDM节点",
        applyToAllNodes: "应用到全部UDM节点",
      },
      toast: {
        saveBeforeApply: "请先保存模型，再应用到画布节点",
        missingVersion: "当前模型缺少版本数据，无法应用",
        appliedToCurrent: "已应用到当前 UDM 节点",
        appliedToAll: "已应用到全部 UDM 节点",
      },
    },
    expressionEditor: {
      title: {
        rateExpr: "编辑 rateExpr - Process {processIndex}",
        stoich: "编辑 stoich - Process {processIndex} / {componentName}",
      },
      processFallback: "process_{processIndex}",
      heading: "表达式编辑器",
      emptyHint: "请输入表达式，例如：u_H*(S_S/(K_S+S_S))*X_BH",
      shortcuts: {
        save: "Ctrl/Cmd + Enter 保存",
        cancel: "Esc 取消",
      },
      validation: {
        heading: "实时校验（仅提示 Warning）",
        noIssues: "未发现明显问题。",
        emptyExpression: "表达式为空。允许保存，但后端校验可能失败。",
        unmatchedRightParen: "存在未匹配的右括号 ')'.",
        unmatchedLeftParen: "存在未匹配的左括号 '('.",
        unknownChar: "存在非法字符：{symbols}",
        unknownSymbol: "存在未知符号：{symbols}",
        stoichComponentRef: "Stoich 表达式引用了组分：{symbols}",
        missingOperatorBetweenSymbols:
          "检测到仅由空白分隔的相邻符号：{pairs}。请补充运算符（如 *, +, -, /）。",
        unknownIssue: "未识别的校验问题：{code}",
      },
      variables: {
        title: "Variables",
        empty: "暂无可用变量。",
      },
      parameters: {
        title: "Parameters",
        empty: "暂无可用参数。",
      },
      functions: {
        title: "函数",
      },
      constants: {
        title: "常量",
      },
      aria: {
        insertVariable: "插入变量 {name}",
        insertParameter: "插入参数 {name}",
        insertFunction: "插入函数 {name}",
        insertConstant: "插入常量 {name}",
      },
    },
  },
  udmModels: {
    title: "UDM 模型库",
    searchPlaceholder: "按模型名称搜索",
    actions: {
      search: "搜索",
      clear: "清空",
      createBlankModel: "新建空白模型",
      createFromTemplate: "从模板创建",
      edit: "编辑",
      duplicate: "复制",
      publish: "发布",
      unpublish: "取消发布",
      delete: "删除",
    },
    sections: {
      templateQuickCreate: "模板快速创建",
      myModels: "我的模型",
    },
    state: {
      templatesLoading: "模板加载中...",
      templatesEmpty: "暂无可用模板",
      modelsLoading: "模型加载中...",
      modelsEmptyTitle: "未找到模型",
      modelsEmptyDescription: "可先新建空白模型，或基于模板快速创建。",
    },
    template: {
      noDescription: "暂无描述",
      stats: "组分: {components} | 过程: {processes} | 参数: {parameters}",
    },
    table: {
      headers: {
        modelName: "模型名称",
        version: "版本",
        publishStatus: "发布状态",
        updatedAt: "更新时间",
        actions: "操作",
      },
      published: "已发布",
      unpublished: "草稿",
    },
    toast: {
      createTemplateSuccess: "已创建模板模型：{name}",
      createTemplateFailed: "从模板创建模型失败",
      duplicateSuccess: "已复制模型：{name}",
      duplicateFailed: "复制模型失败",
      deleteSuccess: "模型已删除",
      deleteFailed: "删除模型失败",
      publishSuccess: "模型已发布",
      unpublishSuccess: "模型已取消发布",
      publishUpdateFailed: "更新发布状态失败",
    },
    confirm: {
      deleteTitle: "确认删除",
      deleteModel: "确认删除模型「{name}」？此操作不可恢复。",
    },
    pagination: {
      prev: "上一页",
      next: "下一页",
      info: "第 {current} / {total} 页",
    },
  },
  modelParams: {
    asm1slim: {
      volume: { label: "体积(m³)", description: "反应器体积，单位：立方米" },
      aerobicCODDegradationRate: {
        label: "好氧COD降解速率参数",
        description: "好氧条件下COD降解速率常数",
      },
      ammonia: { label: "氨氮", description: "氨氮浓度 (mg/L)" },
      ammoniaNitrificationInfluence: {
        label: "氨氮浓度对硝化速率的影响参数",
        description: "氨氮浓度对硝化速率的影响系数",
      },
      cod: { label: "COD", description: "化学需氧量 (mg/L)" },
      codDenitrificationInfluence: {
        label: "COD浓度对反硝化速率的影响参数",
        description: "COD浓度对反硝化速率的影响系数",
      },
      dissolvedOxygen: { label: "溶解氧", description: "溶解氧浓度 (mg/L)" },
      empiricalCNRatio: {
        label: "经验碳氮比",
        description: "经验碳氮比参数",
      },
      empiricalDenitrificationRate: {
        label: "经验反硝化速率",
        description: "经验反硝化速率常数",
      },
      empiricalNitrificationRate: {
        label: "经验硝化速率",
        description: "经验硝化速率常数",
      },
      nitrate: { label: "硝态氮", description: "硝态氮浓度 (mg/L)" },
      nitrateDenitrificationInfluence: {
        label: "硝态氮浓度对反硝化速率的影响参数",
        description: "硝态氮浓度对反硝化速率的影响系数",
      },
      totalAlkalinity: { label: "总碱度", description: "总碱度 (mg/L)" },
    },
    asm1: {
      volume: { label: "体积(m³)", description: "反应器体积，单位：立方米" },
      K_NH: {
        label: "K_NH-自养菌的氨半饱和系数",
        description: "自养菌对氨氮的半饱和常数 (g NH3-N/m3)",
      },
      K_NO: {
        label: "K_NO-异养菌的硝酸盐氮半饱和系数",
        description: "硝态氮半饱和常数 (g NO3-N/m3)",
      },
      K_OA: {
        label: "K_OA-自养菌的氧气半饱和系数",
        description: "自养菌对氧的半饱和常数 (g O2/m3)",
      },
      K_OH: {
        label: "K_OH-异养菌的氧气半饱和系数",
        description: "异养菌对氧的半饱和常数 (g O2/m3)",
      },
      K_S: {
        label: "K_S-异养菌半饱和系数",
        description: "异养菌对易降解基质的半饱和常数 (g COD/m3)",
      },
      K_a: {
        label: "K_a-最大比氨化速率",
        description: "针对有机氨的最大比氨化速率 m3/(g COD(细胞*d)",
      },
      K_h: {
        label: "K_h-最大比水解速率",
        description: "最大比水解速率 (g COD/(Xs)/(g(细胞)*d)",
      },
      K_x: {
        label: "K_x-缓慢生物降解底物水解的半饱和系数",
        description: "缓慢生物降解底物水解的半饱和系数(g COD(Xs)/g(细胞))",
      },
      S_ALK: { label: "碱度", description: "碱度 (mol HCO3-/L)" },
      S_ND: { label: "溶解有机氮", description: "溶解有机氮浓度 (mg N/L)" },
      S_NH: { label: "氨氮", description: "氨氮浓度 (mg N/L)" },
      S_NO: { label: "硝态氮", description: "硝态氮浓度 (mg N/L)" },
      S_O: { label: "溶解氧", description: "溶解氧浓度 (mg O2/L)" },
      S_S: { label: "易降解基质", description: "易降解基质浓度 (mg COD/L)" },
      X_BA: {
        label: "自养菌生物量",
        description: "自养菌生物量浓度 (mg COD/L)",
      },
      X_BH: {
        label: "异养菌生物量",
        description: "异养菌生物量浓度 (mg COD/L)",
      },
      X_ND: { label: "颗粒有机氮", description: "颗粒有机氮浓度 (mg N/L)" },
      X_S: {
        label: "缓慢降解基质",
        description: "缓慢降解基质浓度 (mg COD/L)",
      },
      X_i: { label: "惰性颗粒物", description: "惰性颗粒物浓度 (mg COD/L)" },
      Y_A: {
        label: "Y_A-自养菌产率系数",
        description:
          "自养菌每氧化1g氨氮形成的细胞COD量 (COD(细胞)/g被氧化的氮)",
      },
      Y_H: {
        label: "Y_H-异养菌产率系数",
        description:
          "每氧化污水中1gCOD形成的细胞COD质量(gCOD(细胞)/g被氧化的COD)",
      },
      b_A: {
        label: "b_A-自养菌衰减系数",
        description: "自养菌衰减系数 (1/d)",
      },
      b_H: {
        label: "b_H-异养菌衰减系数",
        description: "异养菌衰减系数 (1/d)",
      },
      f_P: {
        label: "f_P-微生物惰性颗粒比例",
        description:
          "衰减后以惰性颗粒产物存在的那部分微生物占总微生物量的比值",
      },
      i_XB: {
        label: "i_XB-微生物细胞含氮比例",
        description: "单位质量细胞质COD所含氮的质量 (gN/ g COD(细胞))",
      },
      i_XP: {
        label: "i_XP-微生物产物含氮比例",
        description:
          "微生物衰减后形成的物质中，单位质量 COD 所包含的氮质量 (g(N)/g COD (衰减颗粒态产物))",
      },
      n_g: {
        label: "η_g-缺氧条件下异养菌生长的校正因子η_g",
        description: "缺氧条件下的修正因子 量纲为1",
      },
      n_h: {
        label: "n_h-缺氧条件下水解校正因子",
        description: "缺氧条件下水解校正因子 量纲为1",
      },
      u_A: {
        label: "μ_A-自养菌最大比增长速率",
        description: "自养菌最大比增长速率 (1/d)",
      },
      u_H: {
        label: "μ_H-异养菌最大比增长速率",
        description: "异养菌最大比增长速率 (1/d)",
      },
    },
    asm3: {
      volume: { label: "体积(m³)", description: "反应器体积，单位：立方米" },
      K_ALKA: {
        label: "自养菌碱度半饱和常数",
        description: "自养菌碱度半饱和常数 (mmol/L)",
      },
      K_ALKH: {
        label: "异养菌碱度半饱和常数",
        description: "异养菌碱度半饱和常数 (mmol/L)",
      },
      K_AO2: {
        label: "自养菌氧抑制常数",
        description: "自养菌氧抑制常数 (mg O2/L)",
      },
      K_NH4A: {
        label: "自养菌氨氮半饱和常数",
        description: "自养菌氨氮半饱和常数 (mg N/L)",
      },
      K_NH4H: {
        label: "异养菌氨氮半饱和常数",
        description: "异养菌氨氮半饱和常数 (mg N/L)",
      },
      K_NO: { label: "NOx半饱和常数", description: "NOx半饱和常数 (mg N/L)" },
      K_O2A: {
        label: "自养菌氧半饱和常数",
        description: "自养菌氧半饱和常数 (mg O2/L)",
      },
      K_O2H: {
        label: "异养菌氧半饱和常数",
        description: "异养菌氧半饱和常数 (mg O2/L)",
      },
      K_S: {
        label: "基质半饱和常数",
        description: "可溶基质半饱和常数 (mg COD/L)",
      },
      K_STO_H: {
        label: "储存产物半饱和常数",
        description: "储存产物半饱和常数 (mg COD/mg COD)",
      },
      K_X: {
        label: "水解半饱和常数",
        description: "水解半饱和常数 (mg COD/mg COD)",
      },
      S_ALK: { label: "碱度", description: "碱度浓度 (mmol/L)" },
      S_I: {
        label: "可溶惰性物质",
        description: "可溶惰性有机物浓度 (mg COD/L)",
      },
      S_ND: { label: "可溶有机氮", description: "可溶有机氮浓度 (mg N/L)" },
      S_NH: { label: "氨氮", description: "NH4-N浓度 (mg N/L)" },
      S_NO: { label: "硝酸盐和亚硝酸盐", description: "NOx-N浓度 (mg N/L)" },
      S_O: { label: "溶解氧", description: "溶解氧浓度 (mg O2/L)" },
      S_S: { label: "可溶基质", description: "可溶有机物浓度 (mg COD/L)" },
      X_A: {
        label: "自养菌生物量",
        description: "自养菌生物量浓度 (mg COD/L)",
      },
      X_H: {
        label: "异养菌生物量",
        description: "异养菌生物量浓度 (mg COD/L)",
      },
      X_I: {
        label: "颗粒惰性物质",
        description: "颗粒惰性有机物浓度 (mg COD/L)",
      },
      X_ND: { label: "颗粒有机氮", description: "颗粒有机氮浓度 (mg N/L)" },
      X_S: {
        label: "颗粒可降解基质",
        description: "颗粒可降解有机物浓度 (mg COD/L)",
      },
      X_STO: {
        label: "储存产物",
        description: "细胞内储存产物浓度 (mg COD/L)",
      },
      Y_A: {
        label: "自养菌产率",
        description: "自养菌产率系数 (mg COD/mg N)",
      },
      Y_HNOX: {
        label: "异养菌缺氧产率",
        description: "异养菌缺氧产率系数 (mg COD/mg COD)",
      },
      Y_HO2: {
        label: "异养菌好氧产率",
        description: "异养菌好氧产率系数 (mg COD/mg COD)",
      },
      Y_STONOX: {
        label: "缺氧储存产率",
        description: "缺氧储存产率系数 (mg COD/mg COD)",
      },
      Y_STOO2: {
        label: "好氧储存产率",
        description: "好氧储存产率系数 (mg COD/mg COD)",
      },
      b_ANOX: {
        label: "自养菌缺氧衰亡速率",
        description: "自养菌缺氧衰亡速率 (d⁻¹)",
      },
      b_AO2: {
        label: "自养菌好氧衰亡速率",
        description: "自养菌好氧衰亡速率 (d⁻¹)",
      },
      b_HNOX: {
        label: "异养菌缺氧衰亡速率",
        description: "异养菌缺氧衰亡速率 (d⁻¹)",
      },
      b_HO2: {
        label: "异养菌好氧衰亡速率",
        description: "异养菌好氧衰亡速率 (d⁻¹)",
      },
      b_STONOX: {
        label: "储存物缺氧氧化速率",
        description: "储存物缺氧氧化速率 (d⁻¹)",
      },
      b_STOO2: {
        label: "储存物好氧氧化速率",
        description: "储存物好氧氧化速率 (d⁻¹)",
      },
      f_SI: {
        label: "惰性可溶物分数",
        description: "水解产生的惰性可溶物分数 (mg COD/mg COD)",
      },
      f_XI: {
        label: "惰性颗粒物分数",
        description: "衰亡产生的惰性颗粒物分数 (mg COD/mg COD)",
      },
      i_NBM: {
        label: "生物量氮含量",
        description: "生物量氮含量 (mg N/mg COD)",
      },
      i_NSI: {
        label: "可溶惰性物氮含量",
        description: "可溶惰性物氮含量 (mg N/mg COD)",
      },
      i_NSS: {
        label: "可溶基质氮含量",
        description: "可溶基质氮含量 (mg N/mg COD)",
      },
      i_NXI: {
        label: "颗粒惰性物氮含量",
        description: "颗粒惰性物氮含量 (mg N/mg COD)",
      },
      i_NXS: {
        label: "颗粒基质氮含量",
        description: "颗粒基质氮含量 (mg N/mg COD)",
      },
      i_SSBM: {
        label: "生物量TSS含量",
        description: "生物量TSS含量 (mg TSS/mg COD)",
      },
      i_SSSTO: {
        label: "储存产物TSS含量",
        description: "储存产物TSS含量 (mg TSS/mg COD)",
      },
      i_SSXI: {
        label: "颗粒惰性物TSS含量",
        description: "颗粒惰性物TSS含量 (mg TSS/mg COD)",
      },
      k_H: {
        label: "水解速率常数",
        description: "颗粒基质水解速率常数 (d⁻¹)",
      },
      k_STO: {
        label: "储存速率常数",
        description: "储存产物形成速率常数 (d⁻¹)",
      },
      k_a: {
        label: "氨化速率常数",
        description: "氨化速率常数 (m³/(g COD·d))",
      },
      mu_A: {
        label: "自养菌最大比增长速率",
        description: "自养菌最大比增长速率 (d⁻¹)",
      },
      mu_H: {
        label: "异养菌最大比增长速率",
        description: "异养菌最大比增长速率 (d⁻¹)",
      },
      ny_NOX: { label: "缺氧修正因子", description: "缺氧条件修正因子" },
    },
  },
}
