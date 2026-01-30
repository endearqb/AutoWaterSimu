import numpy as np
import torch
from torchdiffeq import odeint
import matplotlib.pyplot as plt
import functools

# 定义污泥通量分布函数 Vesilind的单指数沉降速率模型+扩散模型
# 定义污泥通量分布函数 Takacs双指数模型
def delta_Takacs(C, q_out, V_zs, r_h, r_p, M, v0):
    C = C.unsqueeze(1).repeat(1, M)
    J = torch.zeros(M, M)
    J_q = q_out * C # 每一层上、下流带出的污泥通量 kg/(m2*h)
    # 该方法未考虑实际最大沉降速率v0
    V_max= torch.ones(M,M) * v0
    J_s = torch.minimum(V_max, V_zs*(torch.exp(-r_h*C)-torch.exp(-r_p*C))) * C # 每一层污泥沉降的污泥通量 kg/(m2*h)
    J_s[:-1,:-1] = torch.minimum(J_s[:-1,:-1], J_s[1:,1:]) # 防止污泥沉降速度过大，导致污泥通量过大
    J_s[-2,-1] = 0 # 最底层污泥沉降为0
    J = J_q + J_s # 每一层流出通量分布
    J_out = J.sum(dim=1) # 每一层流出通量求和
    J_in = J.sum(dim=0) # 每一层流入通量求和
    delta = J_in - J_out # 通量差
    return delta 


def oneDTakacs_model(t, y, q_out, V_zs, r_p, r_h, M, delta_h, v0):
    y[y < 0] = 0
    delta = delta_Takacs(y, q_out, V_zs, r_h, r_p, M, v0)
    dy = torch.zeros_like(y)
    dy[1:-1] = delta[1:-1] /delta_h
    return dy

def Takacs_modelrun(hours, N, N_in, depth, area, inflow_rate, reflow_rate, sludge_concentration, sludge_settling_velocity,v0, r_p, r_h):
    M = N + 2 # 增加进水和排水层
    q_in = inflow_rate / area # 进水流速率 m/h
    q_ov = (inflow_rate-reflow_rate) / area # 沉淀池水流上流速率 m/h
    q_re = reflow_rate / area # 回流下流速率 m/h
    delta_h = depth / N # 每层层高
    q_out = torch.zeros(M, M)
    for i in range(N+1):
        if i == 0: # 假设沉淀池的进水来自于外部虚拟的第0层，沉淀池出水也排至虚拟的第0层
            q_out[i, N_in] = q_in
        elif i < N_in: # 进水层以上，逐层定义上流速率
            q_out[i, i-1] = q_ov
        elif i == N_in: # 进水层，同时具有上流和下流
            q_out[i, i-1] = q_ov
            q_out[i, i+1] = q_re
        else: # 进水层以下，逐层定义下流速率
            q_out[i, i+1] = q_re
    # 定义污泥下沉速率初始值 m/h
    V_zs = torch.zeros(M, M) 
    for i in range(1,M-1):
        V_zs[i ,i+1] = sludge_settling_velocity
    # 定义污泥初始浓度 kg/m3
    C = torch.zeros(M)
    # 定义进水污泥浓度 kg/m3
    C[0] = sludge_concentration
    t0 = torch.linspace(0, hours, hours*20)
    Takacs_modified = functools.partial(oneDTakacs_model, q_out=q_out, V_zs=V_zs, r_p=r_p, r_h=r_h, M=M, delta_h=delta_h, v0=v0)
    x= odeint (Takacs_modified,C,t0, method='rk4')  
    return x[-1]



# 定义二沉池参数
depth = 5 # 深度，单位：米
diameter = 20.0  # 直径，单位：米
area = np.pi * (diameter / 2)**2  # 表面积，单位：平方米
area =360
# 定义操作参数
inflow_rate = 660  # 进水流量，单位：立方米/小时
sludge_concentration = 5.62 # 污泥浓度，单位：公斤/立方米
sludge_settling_velocity = 712/24 # 污泥沉降速度，单位：米/小时
reflow_rate = 300  # 回流流量，单位：立方米/小时

q_in = inflow_rate / area # 进水流速率 m/h
q_ov = (inflow_rate-reflow_rate) / area # 沉淀池水流上流速率 m/h
q_re = reflow_rate / area # 回流下流速率 m/h


v0 = 400/24 # 最大沉降速度 m/h
# 定义1-D建模的网格层数
N = 9# 网格层数

# 定义进水层
N_in = 3 # 进水层的层数

# 定义污泥沉降速率系数
r_h = 0.326
r_p = 5
# 定义扩散系数 m2/h
D_df = 13/24

t = 24

# c1 = Takacs_modelrun(t, N, N_in, depth, area, 2*area, reflow_rate, sludge_concentration, sludge_settling_velocity, r_p, r_h)
# c2 = Takacs_modelrun(t, N, N_in, depth, area, 1.8*area, reflow_rate, sludge_concentration, sludge_settling_velocity, r_p, r_h)
# c3 = Takacs_modelrun(t, N, N_in, depth, area, 2.2*area, reflow_rate, sludge_concentration, sludge_settling_velocity, r_p, r_h)
# c4 = Takacs_modelrun(t, N, N_in, depth, area, inflow_rate, reflow_rate, sludge_concentration, sludge_settling_velocity, v0, r_p, r_h)
# case2 = Takacs_modelrun(t, N, N_in, depth, area, inflow_rate, reflow_rate, sludge_concentration, sludge_settling_velocity, 0, r_h)

# x1 = c1[1:-1]*1000
# x2 = c2[1:-1]*1000
# x3 = c3[1:-1]*1000
sludge_concentration = torch.linspace(1, 15, 15)
c = torch.zeros(9, N+2)
for i in range(9):
    c[i] = Takacs_modelrun(t, N, N_in, depth, area, inflow_rate, reflow_rate, sludge_concentration[i], sludge_settling_velocity, v0, r_p, r_h) # type: ignore



# x4 = c4[1:-1]*1000+4.5
y = torch.linspace(1, N, N)
# plt.plot(x1, y, 'r-',label='172')
# plt.plot(x2, y, 'g-',label='169')
# plt.plot(x3, y, 'b-',label='167')
# make the plot window 16:7
plt.figure(figsize=(16, 7))
for i in range(9):
    plt.plot(y, c[i,1:-1]*1000,label='i+1')
plt.yscale('log')
# plt.gca().invert_yaxis()  # This inverts the y-axis

plt.ylabel('C_values')
plt.xlabel('N_values')
plt.xticks(np.arange(0, N+1, 1))
plt.ylim(bottom=1)
plt.grid()
plt.show()
