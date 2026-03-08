Epic 03: Petersen 连续性检查 — 开发计划                                 
                                                                        
Context                                                                 
                                                                        
Epic 1（学习入口与模板体系）和 Epic 2（教学模式编辑器）已完成。现需实现 
Epic 3：将 COD/N/ALK                                                    
守恒检查打造为教学反馈核心能力。当用户在教学编辑器中完成 Petersen       
矩阵后，系统能逐过程检查各守恒维度的平衡，返回可解释的结果（pass/warn/er
ror），并支持定位到具体过程行。                                         
                                                                        
实现步骤                                                                
                                                                        
Step 1: 后端 — 扩展 UDMComponentDefinition 添加 conversion_factors      
                                                                        
文件: backend/app/models.py (L973-979)                                  
                                                                        
- 在 UDMComponentDefinition 中添加可选字段：                            
conversion_factors: Optional[Dict[str, float]] = Field(                 
    default=None, description="守恒维度换算系数，如 {'COD': -1.0, 'N':  
0.0, 'ALK': 0.0}"                                                       
)                                                                       
- 向后兼容：默认 None，无此字段的组分不参与连续性检查                   
                                                                        
Step 2: 后端 — 新增 ContinuityCheckItem 和扩展 UDMValidationResponse    
                                                                        
文件: backend/app/models.py (L1058-1063 附近)                           
                                                                        
- 新增模型：                                                            
class ContinuityCheckItem(SQLModel):                                    
    process_name: str                                                   
    dimension: str  # "COD" | "N" | "ALK"                               
    balance_value: float                                                
    status: str  # "pass" | "warn" | "error"                            
    explanation: str                                                    
    suggestion: Optional[str] = None                                    
    details: Optional[Dict[str, Any]] = None  # 各组分贡献明细          
- 扩展 UDMValidationResponse：                                          
continuity_checks: List[ContinuityCheckItem] =                          
Field(default_factory=list)                                             
                                                                        
Step 3: 后端 — 创建 PetersenContinuityService                           
                                                                        
新建文件: backend/app/services/petersen_continuity.py                   
                                                                        
核心逻辑：                                                              
1. 接收 components（含 conversion_factors）、processes（含 stoich 数值 +
 stoich_expr 符号）、parameters、validation_mode                        
2. 对每个过程，对每个守恒维度（COD/N/ALK）：                            
  - 遍历该过程的所有 stoich 项（使用 stoich 数值字段）                  
  - 对每个组分，查找其 conversion_factor[dimension]                     
  - 累加 stoich_value × conversion_factor 得到 balance_value            
  - |balance_value| < tolerance(1e-6) → pass                            
  - 否则根据 mode：strict → error, teaching → warn, off → skip          
3. 对符号表达式（stoich_expr）无法直接求值的情况，尝试用 parameters     
的默认值进行数值求值                                                    
4. 返回 List[ContinuityCheckItem]                                       
                                                                        
关键函数:                                                               
def check_continuity(                                                   
    *,                                                                  
    components: List[Dict[str, Any]],                                   
    processes: List[Dict[str, Any]],                                    
    parameters: List[Dict[str, Any]],                                   
    dimensions: List[str] | None = None,  # None = all available        
    mode: str = "teaching",  # "strict" | "teaching" | "off"            
    tolerance: float = 1e-6,                                            
) -> List[ContinuityCheckItem]:                                         
                                                                        
- 使用 udm_expression.compile_expression() 对 stoich_expr 做符号求值    
- 各守恒维度的 explanation 需要可读的逐项拆解（如 "-1/Y_H × (-1.0) + 1 ×
 1.0 + ..."）                                                           
                                                                        
Step 4: 后端 — 将连续性检查集成到 validate 接口                         
                                                                        
文件: backend/app/api/routes/udm_models.py (L53-97, L238-251)           
                                                                        
- 修改 _validate_definition_payload() 接收 components/parameters        
完整数据，调用 check_continuity()                                       
- 修改 validate_udm_model_definition() 路由：                           
  - 请求体 UDMModelDefinitionDraft 已包含 components（含                
conversion_factors）、processes、parameters                             
  - 新增可选 query 参数 validation_mode: str = "teaching"               
  - 将 continuity_checks 结果附加到 UDMValidationResponse               
- 兼容策略：无 conversion_factors 的组分不检查；未传 validation_mode    
默认 "teaching"                                                         
                                                                        
Step 5: 后端 — 为种子模板添加 conversion_factors                        
                                                                        
文件: backend/app/services/udm_seed_templates.py                        
                                                                        
为 ASM1 模板的每个组分添加 conversion_factors：                         
{"name": "X_BH", ..., "conversion_factors": {"COD": 1.0, "N": 0.086}},  
{"name": "S_O",  ..., "conversion_factors": {"COD": -1.0}},             
{"name": "S_S",  ..., "conversion_factors": {"COD": -1.0}},             
{"name": "S_NH", ..., "conversion_factors": {"N": 1.0}},                
{"name": "S_NO", ..., "conversion_factors": {"N": -1.0}},               
{"name": "S_ALK",..., "conversion_factors": {"ALK": 1.0}},              
# ... 等                                                                
                                                                        
为 ASM1Slim 模板同样添加（简化版）。                                    
                                                                        
为 tutorial templates 的 meta.learning 添加 continuityProfiles：        
- chapter-3: ["COD", "N"]                                               
- chapter-7: ["COD", "N", "ALK"]                                        
                                                                        
Step 6: 后端 — 单元测试                                                 
                                                                        
新建文件: backend/app/tests/services/test_petersen_continuity.py        
                                                                        
- 测试 ASM1 模板的 COD 守恒（所有过程应 pass）                          
- 测试 N 守恒                                                           
- 测试 teaching 模式下简化模型返回 warn                                 
- 测试 strict 模式下同样场景返回 error                                  
- 测试 off 模式返回空列表                                               
- 测试无 conversion_factors 的组分被跳过                                
                                                                        
Step 7: 前端 — 重新生成 API Client                                      
                                                                        
命令: bash scripts/generate-client.sh                                   
                                                                        
- 确保前端 types.gen.ts 中出现 ContinuityCheckItem 和 continuity_checks 
字段                                                                    
                                                                        
Step 8: 前端 — 创建 ContinuityCheckPanel 组件                           
                                                                        
新建文件: frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx 
                                                                        
功能：                                                                  
- 接收 continuityChecks: ContinuityCheckItem[] 和 onJumpToProcess:      
(processName: string) => void                                           
- 按维度（COD/N/ALK）分组展示                                           
- 每条显示：过程名 | 维度 | 平衡值 | 状态 badge（✓ green / ⚠ orange / ✗ 
 red）                                                                  
- 点击条目触发 onJumpToProcess 跳转到对应过程行                         
- 展开时显示 explanation + suggestion + 详细计算明细                    
- 教学模式下对 warn 条目显示"为什么 / 怎么改"提示                       
                                                                        
Step 9: 前端 — 集成到 UDMModelEditorForm.tsx                            
                                                                        
文件: frontend/src/components/UDM/UDMModelEditorForm.tsx                
                                                                        
修改点：                                                                
1. 在 validation section 下方（L1799 后）添加 <ContinuityCheckPanel>    
2. 从 validation?.continuity_checks 取数据传入                          
3. 复用现有 jumpToIssue 逻辑（构造 ValidationIssue 调用跳转）           
4. 教学模式下在 step 5 才显示连续性面板（与 validation section 一致）   
5. 在 buildDraft() 中确保 components 的 conversion_factors 被包含       
                                                                        
Step 10: 前端 — i18n 支持                                               
                                                                        
文件: frontend/src/i18n/messages/zh.ts 和 en.ts                         
                                                                        
新增键 flow.tutorial.continuity.*：                                     
- sectionTitle: "连续性检查"                                            
- dimensionLabels: { COD, N, ALK }                                      
- statusLabels: { pass, warn, error }                                   
- emptyHint: "点击「校验」后将显示连续性检查结果"                       
- jumpToProcess: "跳到该过程"                                           
- balanceLabel: "平衡值"                                                
- explanationLabel: "说明"                                              
- suggestionLabel: "建议"                                               
- teachingHints（为什么错/怎么改/去看哪章）                             
                                                                        
Step 11: 前端 — 扩展 tutorialLessons 数据                               
                                                                        
文件: frontend/src/data/tutorialLessons.ts                              
                                                                        
- 在 TutorialLesson 接口中添加可选字段 continuityProfiles?: string[]    
- chapter-3 lesson 添加 continuityProfiles: ["COD", "N"]                
- chapter-7 lesson 添加 continuityProfiles: ["COD", "N", "ALK"]         
                                                                        
关键文件清单                                                            
                                                                        
文件: backend/app/models.py                                             
操作: 修改 — 添加 conversion_factors, ContinuityCheckItem, 扩展         
  UDMValidationResponse                                                 
────────────────────────────────────────                                
文件: backend/app/services/petersen_continuity.py                       
操作: 新建 — 核心连续性检查服务                                         
────────────────────────────────────────                                
文件: backend/app/services/udm_seed_templates.py                        
操作: 修改 — 为组分添加 conversion_factors, meta.learning 添加          
  continuityProfiles                                                    
────────────────────────────────────────                                
文件: backend/app/api/routes/udm_models.py                              
操作: 修改 — validate 接口集成连续性检查                                
────────────────────────────────────────                                
文件: backend/app/tests/services/test_petersen_continuity.py            
操作: 新建 — 单元测试                                                   
────────────────────────────────────────                                
文件: frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx     
操作: 新建 — 前端展示面板                                               
────────────────────────────────────────                                
文件: frontend/src/components/UDM/UDMModelEditorForm.tsx                
操作: 修改 — 集成 ContinuityCheckPanel                                  
────────────────────────────────────────                                
文件: frontend/src/data/tutorialLessons.ts                              
操作: 修改 — 添加 continuityProfiles                                    
────────────────────────────────────────                                
文件: frontend/src/i18n/messages/zh.ts                                  
操作: 修改 — 添加 i18n 键                                               
────────────────────────────────────────                                
文件: frontend/src/i18n/messages/en.ts                                  
操作: 修改 — 添加 i18n 键                                               
────────────────────────────────────────                                
文件: frontend/src/client/                                              
操作: 自动重生成                                                        
                                                                        
验证方案                                                                
                                                                        
1. 后端单测: 运行 uv run pytest                                         
backend/app/tests/services/test_petersen_continuity.py                  
2. API 测试: POST /api/v1/udm-models/validate 带有 ASM1 模板数据，确认  
continuity_checks 字段                                                  
3. 前端验证:                                                            
  - 打开 chapter-3 教学模板 → 走到 Step 5 → 点击校验                    
  - 确认 ContinuityCheckPanel 显示 COD/N 检查结果                       
  - 确认 pass 条目显示绿色，warn 显示橙色                               
  - 确认点击条目可跳转到对应过程行                                      
4. 回归: 无 lessonKey 的普通 UDM 编辑器行为不受影响                     
5. 兼容: 无 conversion_factors 的模板验证正常，continuity_checks        
为空数组    