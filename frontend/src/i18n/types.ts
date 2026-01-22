export type Language = "zh" | "en"

export interface I18nMessages {
  app: {
    title: string
    logoAlt: string
  }
  language: {
    label: string
    zh: string
    en: string
  }
  nav: {
    home: string
    flowingFlow: string
    materialBalance: string
    asm1slim: string
    asm1: string
    asm3: string
    knowledge: string
    superDashboard: string
    items: string
    userManagement: string
  }
  userMenu: {
    profile: string
    logout: string
    userFallback: string
  }
  auth: {
    welcomeBack: string
    signupIntro: string
    alreadyHaveAccount: string
    forgotPassword: string
    loginNow: string
    noAccount: string
    signUpNow: string
    emailPlaceholder: string
    fullNamePlaceholder: string
    passwordPlaceholder: string
    confirmPasswordPlaceholder: string
    newPasswordPlaceholder: string
    recoverTitle: string
    recoverDescription: string
    recoverSubmit: string
    recoverSuccess: string
    resetTitle: string
    resetDescription: string
    resetSubmit: string
    resetSuccess: string
  }
  common: {
    success: string
    error: string
    warning: string
    info: string
    loading: string
    notAvailable: string
    id: string
    title: string
    description: string
    role: string
    status: string
    actions: string
    openMenu: string
    expandSidebar: string
    collapseSidebar: string
    you: string
    active: string
    inactive: string
    cancel: string
    confirm: string
    delete: string
    save: string
    edit: string
    create: string
    update: string
    submit: string
    reset: string
    close: string
    retry: string
    unknown: string
    minute: string
    second: string
  }
  updates: {
    empty: string
    backToList: string
    viewMore: string
    publishedAt: string
  }
  deepResearch: {
    hero: {
      title: string
      tagline: string
      description: string
      note: string
    }
    search: {
      placeholder: string
    }
    filters: {
      allCategories: string
      allTags: string
      categoryPlaceholder: string
      tagPlaceholder: string
    }
    stats: {
      articles: string
      categories: string
      tags: string
    }
    article: {
      readFull: string
    }
    empty: {
      title: string
      description: string
    }
    state: {
      loading: string
      loadFailed: string
    }
    detail: {
      back: string
      notFound: {
        title: string
        description: string
      }
      interactiveInProgress: string
      about: {
        title: string
        tagsLabel: string
        descriptionLabel: string
      }
    }
  }
  openflow: {
    hintTitle: string
    instructions: {
      drag: string
      connect: string
      click: string
      doubleClick: string
      loginToRun: string
      exportImport: string
      noLoginCompute: string
      noOnlineSave: string
      noOnlineLoad: string
      noLoadCalcData: string
      deleteKey: string
    }
  }
  time: {
    relative: {
      justNow: string
      minutesAgo: string
      hoursAgo: string
      daysAgo: string
    }
    duration: {
      days: string
      hours: string
      minutes: string
      seconds: string
    }
  }
  file: {
    file: string
    uploadSuccess: string
    uploadFailed: string
    uploading: string
    deleteFile: string
    invalidExtension: string
    invalidMimeType: string
    fileSizeExceeded: string
    upload: {
      success: string
      error: string
      invalidType: string
      sizeExceeded: string
      empty: string
      processing: string
    }
    download: {
      success: string
      error: string
      noResult: string
    }
    validation: {
      unsupportedExtension: string
      unsupportedMimeType: string
      sizeExceeded: string
      supportedFormats: string
      sizeExceededDetail: string
    }
  }
  analysis: {
    task: {
      created: string
      running: string
      completed: string
      failed: string
      cancelled: string
      notFound: string
    }
    error: {
      dataEmpty: string
      dataInvalid: string
      processingFailed: string
      timeout: string
      networkError: string
    }
  }
  dataAnalysis: {
    uploadFile: string
    selectFile: string
    analyzing: string
    analysisComplete: string
    analysisError: string
    noResults: string
    downloadResults: string
    taskCancelled: string
    taskDeleted: string
    noDownloadableResults: string
    downloadStarted: string
    downloadFailed: string
    downloadError: string
    noDownloadLink: string
    status: {
      pending: string
      running: string
      completed: string
      failed: string
      cancelled: string
    }
  }
  api: {
    error: {
      network: string
      timeout: string
      unauthorized: string
      forbidden: string
      notFound: string
      serverError: string
      unknown: string
    }
  }
  validation: {
    required: string
    email: string
    name: string
    password: string
    minLength: string
    maxLength: string
    numeric: string
    passwordMismatch: string
    confirmPasswordRequired: string
  }
  errors: {
    somethingWentWrong: string
    validationError: string
    validationErrors: string
    operationFailed: string
    unexpected: string
  }
  userSettings: {
    title: string
    tabProfile: string
    tabPassword: string
    tabDanger: string
    infoTitle: string
    changePasswordTitle: string
    deleteAccountTitle: string
    deleteAccountDescription: string
    deleteConfirmTitle: string
    deleteConfirmBody: string
    deleteSuccess: string
    userNameLabel: string
    emailLabel: string
    userTypeLabel: string
    userTypeBasic: string
    userTypePro: string
    userTypeUltra: string
    userTypeEnterprise: string
    currentPasswordPlaceholder: string
    newPasswordPlaceholder: string
    confirmNewPasswordPlaceholder: string
    updatePasswordSuccess: string
    updateProfileSuccess: string
  }
  admin: {
    title: string
    addUser: string
    addUserTitle: string
    addUserDescription: string
    editUser: string
    editUserTitle: string
    editUserDescription: string
    emailLabel: string
    fullNameLabel: string
    setPasswordLabel: string
    confirmPasswordLabel: string
    userTypeLabel: string
    selectUserType: string
    userTypeBasic: string
    userTypePro: string
    userTypeUltra: string
    userTypeEnterprise: string
    isSuperuser: string
    isActive: string
    userCreatedSuccess: string
    userUpdatedSuccess: string
    roleSuperuser: string
    roleUser: string
    deleteUser: string
    deleteUserTitle: string
    deleteUserDescription: string
    userDeletedSuccess: string
    userDeletedError: string
  }
  items: {
    title: string
    addItem: string
    addItemTitle: string
    addItemDescription: string
    editItem: string
    editItemTitle: string
    editItemDescription: string
    deleteItem: string
    deleteItemTitle: string
    deleteItemDescription: string
    emptyTitle: string
    emptyDescription: string
    itemCreatedSuccess: string
    itemUpdatedSuccess: string
    itemDeletedSuccess: string
    itemDeletedError: string
  }
  notFound: {
    title: string
    description: string
    back: string
  }
  flow: {
    node: {
      input: string
      output: string
      default: string
      custom: string
      asm1: string
      asm3: string
      asm1slim: string
      cashWallet: string
      goalProgress: string
      volumeLabel: string
      volumeUnit: string
    }
    tab: {
      parameters: string
      calculation: string
      simulation: string
    }
    canvas: {
      doubleClickEdit: string
    }
    inspector: {
      title: string
      emptyState: string
      edgeTitle: string
      expand: string
      collapse: string
    }
    edge: {
      flowPlaceholder: string
    }
    propertyPanel: {
      nameLabel: string
      namePlaceholder: string
      volumeLabel: string
      volumePlaceholder: string
      flowLabel: string
      flowPlaceholder: string
      paramNameLabel: string
      paramNamePlaceholder: string
      paramDescriptionLabel: string
      paramDescriptionPlaceholder: string
      addParam: string
      addAction: string
      addConfirmTitle: string
      deleteConfirmTitle: string
      addConfirmBody: string
      deleteConfirmBody: string
      deleteParamAriaLabel: string
      customParamPlaceholder: string
      target: {
        node: string
        edge: string
      }
      notes: {
        asm1: string
        asm1slim: string
        asm3: string
      }
      errors: {
        nameRequired: string
        volumeNonNegative: string
        flowNonNegative: string
        paramNonNegative: string
        paramNameRequired: string
        paramNameExists: string
        paramNameConflict: string
      }
    }
    calculationPanel: {
      title: string
      emptyState: string
      tip: string
      rangeError: string
      params: {
        density: {
          label: string
          description: string
        }
        viscosity: {
          label: string
          description: string
        }
        temperature: {
          label: string
          description: string
        }
        pressure: {
          label: string
          description: string
        }
        efficiency: {
          label: string
          description: string
        }
      }
    }
    modelCalculation: {
      missingConfig: string
      emptyState: string
      onlyForModel: string
      noParameters: string
      title: string
      syncOn: string
      syncOff: string
      description: string
      tip: string
      rangeError: string
    }
    toolbar: {
      lock: string
      unlock: string
      collapse: string
      expand: string
      editNameTitle: string
      analysisLabel: string
      views: {
        nodes: string
        data: string
        modelParams: string
        results: string
      }
    }
    dataPanel: {
      nodeNameHeader: string
      volumeHeader: string
      empty: string
      defaultNodeName: string
    }
    modelParametersPanel: {
      empty: string
      noParameters: string
      noParametersDetail: string
      modelNodeTypes: string
      title: string
      summary: string
      paramNameHeader: string
    }
    resultsPanel: {
      nodeNameHeader: string
      volumeHeader: string
      empty: string
    }
    jobStatus: {
      pending: string
      running: string
      success: string
      failed: string
      cancelled: string
    }
    simulation: {
      analysisButton: string
      calculationTime: string
      completedTitle: string
      convergenceStatus: string
      defaultFlowchartName: string
      elapsedTime: string
      errorLabel: string
      errorLabelShort: string
      estimatedTotalTime: string
      failedTitle: string
      finalMassBalanceError: string
      finalTotalVolume: string
      hours: string
      inProgress: string
      loadResultFailed: string
      loadingButton: string
      maxIterations: string
      maxMemory: string
      maxTimeAdjusted: string
      minTimeError: string
      overdue: string
      progress: string
      remainingTime: string
      resampleInterval: string
      runtime: string
      samplingInterval: string
      selectSamplingInterval: string
      solverMethod: string
      startButton: string
      startFailed: string
      statusLabel: string
      stepsPerHour: string
      summaryTitle: string
      tolerance: string
      totalSteps: string
      totalTime: string
      unit: {
        hours: string
        perHour: string
        seconds: string
        steps: string
      }
      validation: {
        hoursMax: string
        hoursMin: string
        inputEmpty: string
        maxIterationsMax: string
        maxIterationsMin: string
        maxMemoryMax: string
        maxMemoryMin: string
        samplingIntervalMax: string
        samplingIntervalMin: string
        samplingIntervalPositive: string
        solverMethod: string
        stepsMax: string
        stepsMin: string
        toleranceMax: string
        toleranceMin: string
        unknownModel: string
      }
      validationErrorTitle: string
    }
    menu: {
      actionFailed: string
      actionsAriaLabel: string
      confirmPrompt: string
      confirmSaveMessage: string
      createdAt: string
      defaultFlowchartName: string
      deleteFailed: string
      deleteSuccess: string
      description: string
      descriptionPlaceholder: string
      emptyFlowcharts: string
      enterFlowchartName: string
      fileFormatErrorDescription: string
      fileFormatErrorTitle: string
      flowchartName: string
      flowchartNamePlaceholder: string
      importFailed: string
      importInvalidDescription: string
      importFlowchart: string
      importSuccess: string
      load: string
      loadCalculationData: string
      loadFailed: string
      loadFlowchart: string
      loadFlowchartTitle: string
      loadOnline: string
      loadSuccess: string
      localExport: string
      localImport: string
      networkError: string
      newFlowchart: string
      newFlowchartFailedDescription: string
      newFlowchartFailedTitle: string
      newFlowchartSuccessDescription: string
      newFlowchartSuccessTitle: string
      noDeleteMethod: string
      noLoadMethod: string
      noSaveMethod: string
      saveAndImport: string
      saveAs: string
      saveAsFailed: string
      saveAsSuccess: string
      saveFailed: string
      saveFlowchartTitle: string
      saveOnline: string
      saveSuccess: string
      skipSave: string
      untitledFlowchart: string
      updateFlowchartTitle: string
      updateSuccess: string
      updatedAt: string
    }
    store: {
      flowchart: {
        invalidFormat: string
        invalidGraph: string
        importSuccess: string
        importFailed: string
        saveSuccess: string
        saveFailedNoData: string
        saveFailedWithReason: string
        loadSuccess: string
        loadFailedEmpty: string
        loadFailedWithReason: string
        listSuccess: string
        listFailedNoData: string
        listFailedWithReason: string
        updateSuccess: string
        updateFailedNoData: string
        updateFailedWithReason: string
        deleteSuccess: string
        deleteFailedWithReason: string
        createSuccess: string
      }
      model: {
        createJobFailed: string
        createJobFromFlowchartFailed: string
        getStatusFailed: string
        getSummaryFailed: string
        getTimeSeriesFailed: string
        getFinalValuesFailed: string
        validateInputFailed: string
        getUserJobsFailed: string
        deleteJobFailed: string
        getJobInputFailed: string
        getFlowchartsFailed: string
        createFlowchartFailed: string
        getFlowchartFailed: string
        updateFlowchartFailed: string
        deleteFlowchartFailed: string
        pollingError: string
        pollingTimeout: string
        getCompleteResultsFailed: string
      }
    }
    analysis: {
      aiReportComingSoon: string
      aiReportDescription: string
      aiReportTitle: string
      concentrationAxisLabel: string
      dialogTitle: string
      tabs: {
        t95SteadyCheck: string
        spatialProfile: string
        edgeConcentration: string
        aiReport: string
      }
      edgeSelection: string
      emptyData: string
      emptyRange: string
      flowRate: string
      metricColumn: string
      metricSelection: string
      noAnalysisData: string
      noSteadyStateData: string
      nodeFilter: string
      nodeLabel: string
      nodeSelection: string
      relativeSlopeColumn: string
      selectEdgesAndMetrics: string
      selectNodeForSteadyState: string
      selectNodePrompt: string
      selectNodesAndMetrics: string
      statusColumn: string
      steadyState: {
        approaching: string
        stable: string
        unstable: string
      }
      steadyStateColumn: string
      steadyStateNote: string
      t95Column: string
      t95Description: string
      timeAxisLabel: string
      timeLabel: string
      timeRange: string
      timeSelection: string
      timeTooltipLabel: string
      unavailable: string
    }
    actionPlate: {
      analysisResult: string
      minimap: string
      stepsAriaLabel: string
      resampleAriaLabel: string
      hoursAriaLabel: string
      errors: {
        inputDataMissing: string
        jobIdMissing: string
      }
    }
    themePalette: {
      ariaLabel: string
      title: string
      classicTheme: string
      classicGlass: string
      glass: string
    }
    palette: {
      collapseExtendedPalette: string
      customPaletteEmpty: string
      customPaletteTitle: string
      enhancedPalette: string
      expandExtendedPalette: string
      extendedPalette: string
      heatmapTitle: string
      modeGradient: string
      modeSequence: string
      resetToGlobal: string
      selectColor: string
      selectEnhancedHeatmapScheme: string
      selectGroupedColor: string
      selectHeatmapScheme: string
      schemeDescriptions: {
        blueRed: string
        coolWarm: string
        seabornDiverging: string
        greenOrange: string
        plasma: string
        viridis: string
        cividis: string
        inferno: string
        magma: string
        singleBlue: string
        singleRed: string
        singleGreen: string
        colorBlindFriendly: string
      }
    }
    loadCalculation: {
      columns: {
        createdAt: string
        name: string
        status: string
      }
      detailsTitle: string
      dialogTitle: string
      empty: string
      fetchFailedDescription: string
      fetchFailedTitle: string
      fields: {
        completedAt: string
        createdAt: string
        name: string
        status: string
      }
      loadButton: string
      loadFailedDescription: string
      loadFailedTitle: string
      loadSuccessDescription: string
      loadSuccessTitle: string
      loadingDetails: string
      pagination: string
      selectPrompt: string
      summaryTitle: string
      taskListTitle: string
    }
    dialog: {
      close: string
    }
    modelParams: {
      asm1: Record<string, { label: string; description?: string }>
      asm1slim: Record<string, { label: string; description?: string }>
      asm3: Record<string, { label: string; description?: string }>
    }
  }
  calculators: {
    index: {
      title: string
      subtitle: string
    }
    lsi: {
      title: string
      description: string
      labels: {
        ph: string
        ta: string
        ch: string
        temp: string
        tds: string
      }
      hints: {
        ta: string
      }
      sections: {
        lsi: string
        rsi: string
        breakdown: string
      }
      interpretation: {
        corrosive: string
        scaling: string
        balanced: string
      }
      ryznarInterpretation: {
        strongScaling: string
        slightScaling: string
        balanced: string
        slightCorrosive: string
        significantCorrosive: string
        strongCorrosive: string
      }
      breakdown: {
        phInput: string
        pHs: string
        lsi: string
        rsi: string
        a: string
        b: string
        c: string
        d: string
      }
      note: string
    }
    ao: {
      title: string
      description: string
      tooltip: string
      warnIfNull: string
      toast: {
        denominatorWarning: string
        denominatorNotice: string
      }
      labels: {
        designFlow: string
        ntInfluent: string
        nteEffluent: string
        kde20: string
        mlss: string
        temperature: string
        sludgeYield: string
        soInfluent: string
        seEffluent: string
        totalYield: string
        nitrificationSafety: string
        naInfluent: string
        knHalfSaturation: string
        nkeEffluent: string
        returnRatio: string
      }
      hints: {
        nt: string
        kde20: string
        sludgeYield: string
      }
      sensitivity: {
        title: string
        kdeTitle: string
        yTitle: string
        kdeRange: string
        yRange: string
      }
      chart: {
        vn: string
        qriOriginal: string
      }
      results: {
        title: string
        vn: string
        vo: string
        mu: string
        theta: string
        deltaXv: string
        kdeT: string
        returnFlows: string
        qriOriginal: string
        qriAlt: string
      }
      formulas: {
        title: string
        temperatureTitle: string
        volumeTitle: string
        returnTitle: string
        kde: string
        deltaXv: string
        vn: string
        mu: string
        theta: string
        vo: string
        qriOriginal: string
        qriAlt: string
      }
    }
    aor: {
      title: string
      description: string
      tabs: {
        aor: string
        sor: string
      }
      labels: {
        s0Influent: string
        seEffluent: string
        flowRate: string
        nkInfluent: string
        nkeEffluent: string
        ntInfluent: string
        noeEffluent: string
        volume: string
        mlvss: string
        sludgeAge: string
        bPrime: string
        ea: string
        depth: string
        temperature: string
        c0: string
        alpha: string
        beta: string
      }
      hints: {
        bPrime: string
        alpha: string
        beta: string
      }
      interpretations: {
        aorLow: string
        aorMedium: string
        aorHigh: string
        airWaterLow: string
        airWaterMedium: string
        airWaterHigh: string
      }
      results: {
        aorTitle: string
        sorTitle: string
        airWaterRatio: string
        aorBreakdown: string
        sorBreakdown: string
        bodDemand: string
        nitrificationDemand: string
        endogenousDemand: string
        biomass: string
        oxygenOffgas: string
        avgDo: string
        airSupply: string
        unitKgO2PerDay: string
        unitKgPerDay: string
      }
    }
    dwa: {
      title: string
      description: string
      tabs: {
        waterQuality: string
        processParams: string
        oxygenParams: string
        sstParams: string
      }
      labels: {
        dailyInfluentFlow: string
        influentCod: string
        influentBod5: string
        influentTn: string
        influentTp: string
        influentSs: string
        effluentCod: string
        effluentTn: string
        effluentNh4: string
        designTemp: string
        sludgeConcentration: string
        readilyCodRatio: string
        codYield: string
        decayFactor: string
        maxGrowthRate: string
        alpha: string
        beta: string
        c0: string
        oxygenUtilization: string
        aeratorDepth: string
        designDepth: string
        altitude: string
        dsvi: string
        thickeningTime: string
        returnRatio: string
        shortCircuitFactor: string
        surfaceLoading: string
      }
      hints: {
        readilyCodRatio: string
        codYield: string
        decayFactor: string
        maxGrowthRate: string
        alpha: string
        beta: string
        dsvi: string
        thickeningTime: string
        returnRatio: string
        shortCircuitFactor: string
        surfaceLoading: string
      }
      select: {
        carbonSource: string
        carbonPlaceholder: string
        phosphorusRemoval: string
        phosphorusPlaceholder: string
        options: {
          methanol: string
          ethanol: string
          acetate: string
          ironSalt: string
          aluminumSalt: string
        }
      }
      results: {
        title: string
        recompute: string
        recomputing: string
        bioDesign: string
        oxygenReturn: string
        sstDesign: string
        labels: {
          totalBioVolume: string
          aerobicVolume: string
          anoxicVolume: string
          anaerobicVolume: string
          totalHrt: string
          sludgeAge: string
          avgOxygen: string
          maxOxygen: string
          sor: string
          returnRatio: string
          internalReturnRatio: string
          excessSludge: string
          sstArea: string
          sstDepth: string
          designFlow: string
          influentSludge: string
          returnSludge: string
          sludgeLoading: string
        }
      }
      chart: {
        title: string
        tooltip: {
          bioVolume: string
          sor: string
          totalHrt: string
          label: string
        }
        legend: {
          bioVolume: string
          sor: string
          totalHrt: string
        }
      }
      details: {
        toggle: string
        calculationTitle: string
        calculationItems: {
          item1: string
          item2: string
          item3: string
          item4: string
          item5: string
          item6: string
        }
        noticeTitle: string
        noticeItems: {
          item1: string
          item2: string
          item3: string
        }
      }
      emptyState: {
        prompt: string
        start: string
        calculating: string
      }
    }
  }
  overview: {
    actualWater: string
    currentTime: string
    errors: {
      chlorine: string
      plant: string
      production: string
    }
    nextDayPrefix: string
    predictedWater: string
    subtitle: string
    timeLabel: string
    title: string
  }
  superDashboard: {
    activeUserRanking: string
    activeUsers: string
    activityDetail: string
    activityTotal: string
    allFlowchartTypes: string
    allJobTypes: string
    asm1Flowcharts: string
    asm1JobStatus: string
    asm1Jobs: string
    asm1SlimFlowcharts: string
    asm1SlimJobStatus: string
    asm1SlimJobs: string
    coreMetrics: string
    flowchartCreationRanking: string
    flowchartDistribution: string
    jobCount: string
    jobCreationRanking: string
    jobDistribution: string
    jobStatusDistribution: string
    loadError: string
    loading: string
    materialBalanceFlowcharts: string
    materialBalanceJobStatus: string
    materialBalanceJobs: string
    newUsers: string
    noAccess: string
    recentActiveUsers: string
    status: {
      cancelled: string
      completed: string
      failed: string
      pending: string
      running: string
      unknown: string
    }
    superAdmins: string
    systemAdmins: string
    tableActivity: string
    tableFlowchartCount: string
    tableJobCount: string
    tableRegisteredAt: string
    tableStatus: string
    tableUser: string
    tableUserType: string
    title: string
    totalFlowcharts: string
    totalJobs: string
    totalUsers: string
    userRegistrationTrend: string
    userTypeDistribution: string
    welcome: string
  }
  landing: {
    footer: {
      company: {
        about: string
        contact: string
        openSource: string
        team: string
        title: string
      }
      copyright: string
      features: {
        asm1: string
        asm1Slim: string
        dashboard: string
        flowEditor: string
        materialBalance: string
        title: string
      }
      follow: string
      knowledge: {
        asmTheory: string
        caseStudies: string
        designGuide: string
        materialBalance: string
        parameterGuide: string
        process: string
        title: string
      }
      mottoSubtitle: string
      mottoTitle: string
      tagline: string
    }
    footerCta: {
      contact: string
      description: string
      start: string
      title: string
    }
    hero: {
      caption: string
      contact: string
      headline: string
      imageAlt: string
      startTrial: string
    }
    metrics: {
      activeUsers: string
      dataVolume: string
      flowcharts: string
      simulations: string
    }
    nav: {
      calculators: string
      closeMenu: string
      deepResearch: string
      flow: string
      getStarted: string
      knowledge: string
      toggleMenu: string
      updates: string
    }
    sectionFive: {
      cta: string
      description: string
      descriptionSecondary: string
      exportCta: string
      exportDescription: string
      exportReady: string
      exportStatus: string
      exportTitle: string
      features: {
        autoName: string
        summary: string
      }
      imageAlt: string
      title: string
    }
    sectionFour: {
      modelCta: string
      modelDescription: string
      modelFeatures: {
        customSoon: string
        defaults: string
        descriptions: string
        localizedNames: string
        ranges: string
        typeSpecific: string
      }
      modelImageAlt: string
      modelTitle: string
      switchCta: string
      switchFeatures: {
        perNode: string
        syncOff: string
        syncOn: string
      }
      switchImageAlt: string
      switchQuestions: {
        first: string
        second: string
        third: string
      }
      switchTitle: string
    }
    sectionOne: {
      bodyPrefix: string
      bodySuffix: string
      title: string
    }
    sectionThree: {
      cta: string
      description: string
      features: {
        create: string
        drag: string
        inspect: string
        resize: string
      }
      imageAlt: string
      title: string
    }
    sectionTwo: {
      cta: string
      description: string
      features: {
        asm1: string
        asm1Slim: string
        materialBalance: string
        more: string
      }
      imageAlt: string
      title: string
    }
    stories: {
      play: string
      title: string
      videoPlaceholder: string
    }
    wordAnimation: {
      aiModels: string
      asm1Slim: string
      asm2d: string
      asm3: string
      classicAsm1: string
      customModel: string
      materialBalance: string
    }
  }
  dashboard: {
    greeting: string
    welcomeBack: string
    placeholder: string
  }
}
