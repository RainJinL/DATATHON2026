import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import os

# ==========================================
# 0. 数据加载与环境设定
# ==========================================
torch.set_default_dtype(torch.float64)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N_GRID = 51 # Double 性能较低，降低一点网格
LR = 0.05
EPOCHS = 200

bc_path = r"D:\user\Downloads\border_openness.csv"
area_path = r"D:\user\Downloads\area_km2.csv"
file_path = r"C:\Users\user\Desktop\regional_quarterly_infection_rate.csv"
output_file = r"C:\Users\user\.gemini\antigravity\scratch\rust_pde_solver\final_cuda_results.csv"

df = pd.read_csv(file_path)
Adf = pd.read_csv(area_path)
Cdf = pd.read_csv(bc_path)

t_data = torch.tensor(df.iloc[:, 0].values, dtype=torch.float64, device=DEVICE)
# 获取所有区域的目标数据 [T, Regions]
target_data = torch.tensor(df.iloc[:, 1:].values, dtype=torch.float64, device=DEVICE)
num_regions = target_data.shape[1]

# 提取每个区域的物理参数
target_init_rates = target_data[0, :]
max_capacities = target_data.max(dim=0).values * 1.5
r_domains = torch.sqrt(torch.tensor(Adf.iloc[0, 1:].astype(float).values, dtype=torch.float32, device=DEVICE) / np.pi)
l_domains = r_domains * 1.2

# ==========================================
# 1. 向量化 PDE Solver
# ==========================================
class PDESolver(nn.Module):
    def __init__(self, num_regions):
        super().__init__()
        # 初始猜测：D=5000, r=0.2, gamma=0.05
        # 使用 log 空间以保证参数为正
        self.params = nn.Parameter(torch.tensor([[np.log(5000.0), np.log(0.2), np.log(0.05)]] * num_regions, 
                                               device=DEVICE))

    def forward(self, t_eval):
        D = torch.exp(self.params[:, 0])
        r = torch.exp(self.params[:, 1])
        gamma = torch.exp(self.params[:, 2])
        
        N = N_GRID
        # 简化版：这里我们使用统一的相对坐标，通过 L 缩放
        # 为了高效，我们将所有区域的 L 对齐 (虽然物理上不同，但在计算网格上是对齐的)
        dx_relative = 2.0 / N
        
        # 初始条件 [Regions, N, N]
        coords = torch.linspace(-1.0, 1.0, N, device=DEVICE)
        Y, X = torch.meshgrid(coords, coords, indexing='ij')
        dist_sq_rel = X**2 + Y**2
        
        # 将 L 扩充到 [Regions, 1, 1]
        L_v = l_domains.view(-1, 1, 1)
        R_v = r_domains.view(-1, 1, 1)
        dist_sq = dist_sq_rel.unsqueeze(0) * (L_v**2)
        domain = dist_sq <= (R_v**2)
        
        # 初始化
        u = torch.exp(-dist_sq / 20000.0) # 简化初始化
        # 归一化到 target_init_rates
        for i in range(num_regions):
            mask = domain[i]
            mean_val = u[i][mask].mean()
            u[i] = u[i] * (target_init_rates[i] / (mean_val + 1e-15))
        
        u = torch.clamp(u, min=0.0)
        u = torch.min(u, max_capacities.view(-1, 1, 1))
        
        history = []
        curr_t = 0.0
        eval_idx = 0
        
        if t_eval[0] == 0:
            res = torch.stack([u[i][domain[i]].mean() for i in range(num_regions)])
            history.append(res)
            eval_idx += 1

        # 核心迭代 (全向量化)
        dt = 0.5 # 简化固定步长或根据 D_max 动态
        
        while eval_idx < len(t_eval):
            # 拉普拉斯
            u_up    = torch.roll(u,  1, 1)
            u_down  = torch.roll(u, -1, 1)
            u_left  = torch.roll(u,  1, 2)
            u_right = torch.roll(u, -1, 2)
            
            # dx = 2*L/N -> dx^2 = (2*L/N)^2
            dx_sq = ((2 * l_domains) / N)**2
            laplacian = (u_up + u_down + u_left + u_right - 4 * u) / dx_sq.view(-1, 1, 1)
            
            # 方程更新
            K = max_capacities.view(-1, 1, 1)
            dv = (D.view(-1, 1, 1) * laplacian + 
                  r.view(-1, 1, 1) * u * (1 - u / K) - 
                  gamma.view(-1, 1, 1) * u)
            
            u = u + dt * dv
            u = torch.clamp(u, min=0)
            u[~domain] = 0
            curr_t += dt
            
            if curr_t >= t_eval[eval_idx]:
                res = torch.stack([u[i][domain[i]].mean() for i in range(num_regions)])
                history.append(res)
                eval_idx += 1
                
        return torch.stack(history) # [Time, Regions]

# ==========================================
# 2. 优化循环
# ==========================================
print(f"🏁 启动全量并行 GPU 拟合 | 区域数: {num_regions}")
model = PDESolver(num_regions)
optimizer = torch.optim.Adam(model.parameters(), lr=LR)
criterion = nn.MSELoss()

for epoch in range(EPOCHS):
    optimizer.zero_grad()
    prediction = model(t_data)
    loss = criterion(prediction, target_data)
    loss.backward()
    optimizer.step()
    
    if epoch % 10 == 0:
        print(f"Epoch {epoch} | Loss: {loss.item():.2e}")

# ==========================================
# 3. 结果保存
# ==========================================
final_params = torch.exp(model.params).detach().cpu().numpy()
results_df = pd.DataFrame(final_params, columns=['D', 'r', 'gamma'])
results_df['region_index'] = range(1, num_regions + 1)
results_df.to_csv(output_file, index=False)
print(f"✨ 拟合完成！结果已存至: {output_file}")
