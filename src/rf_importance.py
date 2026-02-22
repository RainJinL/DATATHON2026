import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

print("🚀 Generating Random Forest Feature Importance for All Parameters...")
dfX = pd.read_csv("transposed_features_matrix.csv")
dfY = pd.read_csv("final_output.csv")

# Add the same engineered features used in the balanced models
num_samples = len(dfX)
dfX['quarter_id'] = np.tile(np.arange(8), 30)[:num_samples]

# Interactions used across models
dfX['mobility_density'] = dfX['mobility_index'] * dfX['population_density']
dfX['growth_climatic'] = dfX['population_density'] * np.exp(-10.0 * (dfX['temperature'] - 0.45)**2)
dfX['healthcare_strength'] = dfX['hospital_beds_per_capita'] * dfX['testing_rate']

feature_names = dfX.columns.tolist()
X = dfX.values

targets = {
    'D (Diffusion)': {'col': 1, 'color': 'viridis', 'log': True},
    'r (Growth Rate)': {'col': 2, 'color': 'magma', 'log': False},
    'gamma (Clearance)': {'col': 3, 'color': 'rocket', 'log': False},
}

fig, axes = plt.subplots(1, 3, figsize=(30, 10))

for idx, (name, cfg) in enumerate(targets.items()):
    y = dfY.values[:, cfg['col']]
    
    if cfg['log']:
        mask = (y > 0)
        X_use = X[mask]
        y_use = np.log10(y[mask])
    else:
        mask = (y >= 0) if 'gamma' in name else (y > 0)
        X_use = X[mask]
        y_use = y[mask]
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_use)
    
    rf = RandomForestRegressor(n_estimators=500, max_depth=12, random_state=42, n_jobs=-1)
    rf.fit(X_scaled, y_use)
    
    importances = rf.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    ax = axes[idx]
    sns.barplot(
        x=importances[indices],
        y=[feature_names[i] for i in indices],
        palette=cfg['color'],
        ax=ax
    )
    ax.set_title(f"RF Feature Importance — {name}", fontsize=14, fontweight='bold')
    ax.set_xlabel("Importance (Gini)", fontsize=12)
    
    # Print top 5
    print(f"\n📊 Top 5 Features for {name}:")
    for rank, i in enumerate(indices[:5]):
        print(f"  {rank+1}. {feature_names[i]}: {importances[i]:.4f}")

plt.tight_layout()
plt.savefig("rf_feature_importance_all.png", dpi=150)
print("\n✅ Saved: rf_feature_importance_all.png")
