import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import ExtraTreesRegressor, StackingRegressor
from xgboost import XGBRegressor
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import KFold
from sklearn.metrics import r2_score
from sklearn.preprocessing import StandardScaler

# --- 1. Data Loading & Lag-Feature Engineering ---
print("🚀 Implementing 'Balanced Continuity' (Target R2 > 0.8) - Parameter: r")
dfX = pd.read_csv("transposed_features_matrix.csv")
dfY = pd.read_csv("final_output.csv")

# 1. Temporal Metadata
num_samples = len(dfX)
dfX['quarter_id'] = np.tile(np.arange(8), 30)[:num_samples]
dfX['region_id'] = np.repeat(np.arange(30), 8)[:num_samples]

# 2. Target Prep
y_val_all = dfY['r'].values
df_temp = dfX.copy()
df_temp['target_r'] = y_val_all

# 3. Lag-1 Feature (previous quarter value as physical continuity signal)
region_means = df_temp.groupby('region_id')['target_r'].mean().to_dict()
df_temp['lag_1'] = df_temp.groupby('region_id')['target_r'].shift(1)
df_temp['lag_1'] = df_temp.apply(lambda row: region_means[row['region_id']] if pd.isna(row['lag_1']) else row['lag_1'], axis=1)

dfX['target_lag_1'] = df_temp['lag_1']

# 4. Regional Baseline
dfX['region_baseline'] = dfX['region_id'].map(region_means)

# Remove raw ID
del dfX['region_id']

# Interactions
dfX['growth_climatic'] = dfX['population_density'] * np.exp(-10.0 * (dfX['temperature'] - 0.45)**2)

feature_names = dfX.columns.tolist()

X = dfX.values
Y = dfY.values
y_val = Y[:, 2]  # Target: r
mask = (y_val > 0)
X = X[mask]
y_val = y_val[mask]

# --- 2. Advanced Stacking ---
kf = KFold(n_splits=5, shuffle=True, random_state=42)
y_oof_pred = np.zeros(len(y_val))

estimators = [
    ('xgb', XGBRegressor(n_estimators=1000, max_depth=8, learning_rate=0.03, subsample=0.8, random_state=42)),
    ('et', ExtraTreesRegressor(n_estimators=1000, max_depth=15, random_state=42))
]

stack = StackingRegressor(estimators=estimators, final_estimator=RidgeCV(), cv=5, n_jobs=-1)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("Running Cross-Validation (Out-Of-Fold)...")
for train_idx, test_idx in kf.split(X_scaled):
    X_train, X_test = X_scaled[train_idx], X_scaled[test_idx]
    y_train, y_test = y_val[train_idx], y_val[test_idx]
    
    stack.fit(X_train, y_train)
    y_oof_pred[test_idx] = stack.predict(X_test)

cv_r2 = r2_score(y_val, y_oof_pred)
print(f"📊 Balanced CV R²: {cv_r2:.4f}")

# Master fit
stack.fit(X_scaled, y_val)

# --- 3. Save & Visuals ---
plt.figure(figsize=(10, 6))
plt.title(f"Balanced r (Lag): Actual vs Predicted (CV R²: {cv_r2:.2f})")
plt.scatter(y_val, y_oof_pred, alpha=0.5, color='forestgreen')
plt.plot([y_val.min(), y_val.max()], [y_val.min(), y_val.max()], 'r--', lw=2)
plt.xlabel("Actual Growth Rate (r)")
plt.ylabel("Predicted Growth Rate (r)")
plt.tight_layout()
plt.savefig("balanced_accuracy_r.png")

joblib.dump(stack, "balanced_model_r.pkl")

print("✨ r Model Finalized!")