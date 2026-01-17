# SimulationPanel 配置优化分析

## 1. 现状分析

### 1.1 数据设置方式分析

通过分析三个流程图页面的配置，发现它们在 SimulationPanel 中设置数据的方式是**一致的**：

#### Material Balance 页面 (`materialbalance.tsx`)
```typescript
{
  key: 'simulation',
  label: '模拟计算',
  component: SimulationPanel,
  props: { modelStore: useMaterialBalanceStore }
}
```

#### ASM1 页面 (`asm1.tsx`)
```typescript
{
  key: 'simulation',
  label: '模拟计算',
  component: SimulationPanel,
  props: { modelStore: useASM1Store }
}
```

#### ASM1Slim 页面 (`asm1slim.tsx`)
```typescript
{
  key: 'simulation',
  label: '模拟计算',
  component: SimulationPanel,
  props: { modelStore: useASM1SlimStore }
}
```

**结论**: 三个页面都使用相同的配置模式，只是传入不同的 `modelStore`。这种方式已经比较统一，但可以进一步抽象化。

### 1.2 滑块配置现状分析

在 `SimulationPanel.tsx` 中，所有滑块的配置都是**硬编码**的：

#### 运行时间滑块
- **最小值**: 0.5 (硬编码)
- **最大值**: 动态计算 (基于体积耗尽时间)
- **步长**: 0.5 (硬编码)
- **显示**: 始终显示

#### 每小时步数滑块
- **最小值**: 10 (硬编码)
- **最大值**: 100 (硬编码)
- **步长**: 10 (硬编码)
- **显示**: 始终显示

#### 最大迭代次数滑块
- **最小值**: 100 (硬编码)
- **最大值**: 5000 (硬编码)
- **步长**: 100 (硬编码)
- **显示**: 始终显示

#### 最大内存限制滑块
- **最小值**: 512 (硬编码)
- **最大值**: 4096 (硬编码)
- **步长**: 256 (硬编码)
- **显示**: 始终显示

#### 容差设置
- **类型**: Input 输入框
- **默认值**: 1e-3 (硬编码)
- **显示**: 始终显示

#### 求解器方法
- **类型**: 只读 Input
- **值**: "rk4" (硬编码)
- **显示**: 始终显示

**问题**:
1. 所有配置都硬编码在组件中，无法根据不同流程图类型进行定制
2. 不同模型可能需要不同的参数范围和默认值
3. 某些参数对特定模型可能不适用，但仍然显示
4. 缺乏灵活性，难以维护和扩展

## 2. 优化方案

### 2.1 创建统一配置文件

创建 `src/config/simulationConfig.ts` 配置文件：

```typescript
export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  visible: boolean;
  label: string;
  unit?: string;
}

export interface InputConfig {
  type: 'number' | 'text';
  defaultValue: string | number;
  placeholder?: string;
  readOnly?: boolean;
  visible: boolean;
  label: string;
  step?: string;
}

export interface SimulationConfig {
  hours: SliderConfig;
  stepsPerHour: SliderConfig;
  maxIterations: SliderConfig;
  maxMemoryMb: SliderConfig;
  tolerance: InputConfig;
  solverMethod: InputConfig;
}

export const simulationConfigs: Record<string, SimulationConfig> = {
  materialBalance: {
    hours: {
      min: 0.5,
      max: 24,
      step: 0.5,
      defaultValue: 1,
      visible: true,
      label: '运行时间',
      unit: '小时'
    },
    stepsPerHour: {
      min: 5,
      max: 50,
      step: 5,
      defaultValue: 10,
      visible: true,
      label: '每小时步数'
    },
    maxIterations: {
      min: 50,
      max: 2000,
      step: 50,
      defaultValue: 1000,
      visible: true,
      label: '最大迭代次数'
    },
    maxMemoryMb: {
      min: 256,
      max: 2048,
      step: 128,
      defaultValue: 1024,
      visible: true,
      label: '最大内存限制',
      unit: 'MB'
    },
    tolerance: {
      type: 'number',
      defaultValue: 1e-3,
      step: '1e-4',
      visible: true,
      label: '计算容差',
      placeholder: '1e-3'
    },
    solverMethod: {
      type: 'text',
      defaultValue: 'euler',
      readOnly: true,
      visible: true,
      label: '求解器方法',
      placeholder: 'euler'
    }
  },
  
  asm1: {
    hours: {
      min: 0.5,
      max: 10,
      step: 0.5,
      defaultValue: 2,
      visible: true,
      label: '运行时间',
      unit: '小时'
    },
    stepsPerHour: {
      min: 10,
      max: 100,
      step: 10,
      defaultValue: 20,
      visible: true,
      label: '每小时步数'
    },
    maxIterations: {
      min: 100,
      max: 5000,
      step: 100,
      defaultValue: 2000,
      visible: true,
      label: '最大迭代次数'
    },
    maxMemoryMb: {
      min: 512,
      max: 4096,
      step: 256,
      defaultValue: 2048,
      visible: true,
      label: '最大内存限制',
      unit: 'MB'
    },
    tolerance: {
      type: 'number',
      defaultValue: 1e-4,
      step: '1e-5',
      visible: true,
      label: '计算容差',
      placeholder: '1e-4'
    },
    solverMethod: {
      type: 'text',
      defaultValue: 'rk4',
      readOnly: true,
      visible: true,
      label: '求解器方法',
      placeholder: 'rk4'
    }
  },
  
  asm1slim: {
    hours: {
      min: 0.5,
      max: 10,
      step: 0.5,
      defaultValue: 1,
      visible: true,
      label: '运行时间',
      unit: '小时'
    },
    stepsPerHour: {
      min: 10,
      max: 100,
      step: 10,
      defaultValue: 10,
      visible: true,
      label: '每小时步数'
    },
    maxIterations: {
      min: 100,
      max: 5000,
      step: 100,
      defaultValue: 1000,
      visible: true,
      label: '最大迭代次数'
    },
    maxMemoryMb: {
      min: 512,
      max: 4096,
      step: 256,
      defaultValue: 1024,
      visible: true,
      label: '最大内存限制',
      unit: 'MB'
    },
    tolerance: {
      type: 'number',
      defaultValue: 1e-3,
      step: '1e-4',
      visible: true,
      label: '计算容差',
      placeholder: '1e-3'
    },
    solverMethod: {
      type: 'text',
      defaultValue: 'rk4',
      readOnly: true,
      visible: true,
      label: '求解器方法',
      placeholder: 'rk4'
    }
  }
};

export const getSimulationConfig = (modelType: string): SimulationConfig => {
  return simulationConfigs[modelType] || simulationConfigs.materialBalance;
};
```

### 2.2 修改 SimulationPanel 组件

```typescript
import { getSimulationConfig } from '../../../config/simulationConfig';

interface SimulationPanelProps {
  store?: () => RFState;
  modelStore?: () => BaseModelState<any, any, any, any, any>;
  modelType?: string; // 新增：模型类型
}

function SimulationPanel({ store, modelStore, modelType = 'materialBalance' }: SimulationPanelProps) {
  // 获取当前模型的配置
  const config = getSimulationConfig(modelType);
  
  // 使用配置中的值替换硬编码值
  // 例如：
  // min={config.hours.min}
  // max={config.hours.max}
  // step={config.hours.step}
  // ...
}
```

### 2.3 更新路由页面配置

#### Material Balance 页面
```typescript
{
  key: 'simulation',
  label: '模拟计算',
  component: SimulationPanel,
  props: { 
    modelStore: useMaterialBalanceStore,
    modelType: 'materialBalance'
  }
}
```

#### ASM1 页面
```typescript
{
  key: 'simulation',
  label: '模拟计算',
  component: SimulationPanel,
  props: { 
    modelStore: useASM1Store,
    modelType: 'asm1'
  }
}
```

#### ASM1Slim 页面
```typescript
{
  key: 'simulation',
  label: '模拟计算',
  component: SimulationPanel,
  props: { 
    modelStore: useASM1SlimStore,
    modelType: 'asm1slim'
  }
}
```

## 3. 优化效果

### 3.1 灵活性提升
- 每个模型可以有独立的参数配置
- 可以控制参数的显示/隐藏
- 易于添加新的模型类型

### 3.2 维护性改善
- 配置集中管理，修改方便
- 减少代码重复
- 类型安全的配置

### 3.3 扩展性增强
- 可以轻松添加新的参数类型
- 支持更复杂的配置逻辑
- 便于国际化支持

### 3.4 用户体验优化
- 不同模型显示相关参数
- 更合理的默认值和范围
- 更清晰的参数说明

## 4. 实施步骤

1. **创建配置文件** - 定义 `simulationConfig.ts`
2. **修改 SimulationPanel** - 使用配置替换硬编码值
3. **更新路由页面** - 传入 `modelType` 参数
4. **测试验证** - 确保三个页面正常工作
5. **文档更新** - 更新相关文档和注释

## 5. 注意事项

1. **向后兼容** - 确保现有功能不受影响
2. **类型安全** - 使用 TypeScript 确保配置类型正确
3. **默认值处理** - 提供合理的默认配置
4. **错误处理** - 处理配置缺失或错误的情况
5. **性能考虑** - 避免不必要的重新渲染