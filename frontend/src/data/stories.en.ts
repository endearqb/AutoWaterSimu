import type { Story } from "./stories"

export const storiesEn: Story[] = [
  {
    id: 1,
    title: "Material Balance — A tensor-based material balance simulator",
    description:
      "Material Balance leverages PyTorch tensor computation and ODE solvers for high-performance dynamic mass-balance simulation, enabling real-time calculation and visualization for complex process networks.",
    name: "Er Bian Feng",
    company: "ENVDAMA",
    country: "China",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content:
          "Material Balance is the first door into the world of wastewater process simulation.",
      },
      {
        type: "question",
        content: "What is material balance simulation?",
      },
      {
        type: "paragraph",
        content:
          "In wastewater treatment modeling, material balance is the most fundamental and critical step. It focuses on whether each component’s “in, out, and accumulation” satisfies mass conservation, without requiring complex biokinetics. The Material Balance module provides a tensor-friendly flowchart modeling UI where you can freely build influent/effluent, tanks, pipes, and other units. The system generates the corresponding ODEs automatically and runs dynamic simulations, helping both students and engineers quickly build intuition about how water quality evolves over time.",
      },
      {
        type: "question",
        content: "What are the core technical advantages?",
      },
      {
        type: "paragraph",
        content:
          "Built on PyTorch, the module benefits from GPU-accelerated tensor operations and vectorized data structures. It can handle multi-component, multi-node networks, supports topology analysis and basic flowchart validation, and provides multiple ODE solvers (e.g., RK45, Radau, BDF) for stiff and non-stiff systems. Once a flowchart is created visually, users can start a simulation and view key outputs such as concentration trajectories, volume balance, and time-series results in real time.",
      },
      {
        type: "question",
        content: "How does it bridge to more advanced models?",
      },
      {
        type: "paragraph",
        content:
          "Material Balance is not only an entry point, but also a bridge toward understanding ASM models. By mastering flowchart construction, connectivity, boundary conditions, and the basic computation loop (including tensor-based solving), users build a solid foundation before stepping into more complex biochemical reaction models like ASM1-Slim and ASM1.",
      },
    ],
  },
  {
    id: 2,
    title: "ASM1Slim — A simplified activated sludge model simulator",
    description:
      "ASM1Slim keeps five core state variables and simplified reaction pathways to provide an efficient and intuitive learning and experimentation platform, balancing teaching value and engineering practicality.",
    name: "Er Bian Feng",
    company: "ENVDAMA",
    country: "China",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content:
          "ASM1Slim is the best starting point to move from material balance into activated sludge modeling.",
      },
      {
        type: "question",
        content: "What is the design philosophy of ASM1Slim?",
      },
      {
        type: "paragraph",
        content:
          "ASM1Slim is a streamlined re-design of the classic ASM1 model. It preserves five key variables—dissolved oxygen, readily biodegradable substrate, nitrate, ammonia, and alkalinity—and focuses on the core processes of nitrification, denitrification, and carbon oxidation. With clear Monod kinetics and aerobic/anoxic switching logic, it significantly reduces complexity while maintaining the essential biochemical mechanisms, making it ideal for teaching, rapid prototyping, and beginners.",
      },
      {
        type: "question",
        content: "How is the user experience?",
      },
      {
        type: "paragraph",
        content:
          "ASM1Slim follows the same drag-and-drop modeling paradigm as Material Balance. Users can build reactor networks on the canvas, configure node properties, set simulation parameters, and run jobs with one click. The inspector on the right provides three primary tabs—properties, calculation control, and results—so modeling, parameterization, and analysis happen in one place with a smooth workflow.",
      },
      {
        type: "question",
        content: "How does it relate to the full ASM1 model?",
      },
      {
        type: "paragraph",
        content:
          "ASM1Slim acts as a bridge between “non-reactive material balance” and “full-state ASM1.” By using simplified reaction mechanisms and coupling logic, users can build early intuition for the dynamic interplay of denitrification, aerobic degradation, and nitrification, preparing them to handle the richer microbial populations and pathways in the complete ASM1 model.",
      },
    ],
  },
  {
    id: 3,
    title: "ASM1 — The standard activated sludge model simulator",
    description:
      "ASM1 implements the IWA Activated Sludge Model No.1 with support for multiple state variables, reaction processes, complex networks, and dynamic simulations for design, education, and optimization.",
    name: "Er Bian Feng",
    company: "ENVDAMA",
    country: "China",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content:
          "ASM1 is the gold standard in wastewater treatment modeling and a core capability of the SaaS simulation platform.",
      },
      {
        type: "question",
        content: "What key features does the ASM1 module support?",
      },
      {
        type: "paragraph",
        content:
          "Based on the IWA ASM1 specification, the module supports 11 state variables and 8 biochemical processes, and runs efficient simulations via tensor computation. Users can build multi-unit networks with influent, effluent, mixing, and reactor nodes, and configure detailed parameters (e.g., X_BH, S_S, S_NO). The inspector provides quick access to parameters, simulation control, and job panels, while results are presented through time series, mass-balance views, and final-state summaries.",
      },
      {
        type: "question",
        content: "How does ASM1 improve upon ASM1Slim?",
      },
      {
        type: "paragraph",
        content:
          "Compared with ASM1Slim’s five-state setup and simplified rate logic, ASM1 includes a complete set of particulate and soluble components for carbon, nitrogen, and alkalinity, and explicitly models microbial growth/decay, hydrolysis, and nitrification. It offers higher accuracy and interpretability, supports custom parameter sets (e.g., μ_H, Y_H, K_S), and enables simulation of cascades and different operating modes (e.g., A/O, UCT), making it suitable for real-world analysis and research.",
      },
      {
        type: "question",
        content: "Who is the ASM1 module for?",
      },
      {
        type: "paragraph",
        content:
          "ASM1 is designed for environmental engineering students with fundamentals, plant engineers, and researchers. It is well-suited for users who want to study process mechanisms, run sensitivity analysis, and compare control strategies. The module supports a full loop from learning the modeling logic to validating operational strategies and producing analysis reports.",
      },
    ],
  },
  {
    id: 4,
    title: "Model Extensions — A composable engine for bio/chemical reactions",
    description:
      "The model extension module supports mixing multiple biological models (e.g., ASM1, ASM2d, ASM3) and user-defined chemical reactions (e.g., redox, precipitation, gas–liquid transfer) in one flowchart, enabling advanced modeling freedom for research and power users.",
    name: "Er Bian Feng",
    company: "ENVDAMA",
    country: "China",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content:
          "Model extensions are the key step from teaching to research, and from standard models to real systems.",
      },
      {
        type: "question",
        content: "How can multiple biological models be mixed in one flowchart?",
      },
      {
        type: "paragraph",
        content:
          "The module allows multiple biological reactor nodes (e.g., ASM1, ASM2d, ASM3) to coexist within the same network. Each reactor can select its own model type and parameter library. At runtime, the system aligns state dimensions and maps boundary data automatically, enabling complex hybrid networks such as A²/O, MBR + Anammox, or multi-stage nitrogen removal. This bridges “single-model exercises” to “real process reconstruction” for both teaching and research.",
      },
      {
        type: "question",
        content:
          "Can chemical reaction processes be customized, such as redox reactions?",
      },
      {
        type: "paragraph",
        content:
          "Users can define new reaction pathways and rate expressions via configuration or UI, which is ideal for redox reactions, metal-ion precipitation, and buffering systems. You can specify reactants/products, reaction orders, rate constants, and dependencies on temperature, pH, or ionic strength. The platform integrates the reactions into the ODE-solving framework, supporting advanced research workflows such as persulfate oxidation, iron–phosphorus co-precipitation, or hypochlorite redox modules for precise bio-chemical coupled simulations.",
      },
      {
        type: "question",
        content: "Who is model extension for?",
      },
      {
        type: "paragraph",
        content:
          "This feature targets researchers and advanced engineers who want to go beyond standard-model boundaries. It supports customization and experimentation inside the platform, enabling reproduction of literature processes or building entirely new reaction chains—an essential capability for a programmable wastewater modeling engine.",
      },
    ],
  },
]
