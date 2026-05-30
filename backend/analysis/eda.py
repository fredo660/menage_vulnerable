import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns



# Charger les données
df = pd.read_csv("../app/analysis/data/dataset_menages_vulnerables.csv")

# Afficher les premières lignes
print(df.head())

# Dimensions
print("\nDimensions :", df.shape)

# Informations générales
print("\nInformations :")
print(df.info())

# Valeurs manquantes
print("\nValeurs manquantes :")
print(df.isnull().sum())

# Doublons
print("\nDoublons :", df.duplicated().sum())

# Statistiques descriptives
print("\nStatistiques :")
print(df.describe())

#Distribution de la vulnérabilité

sns.countplot(x="vulnerabilite", data=df)

plt.title("Distribution des ménages vulnérables")
plt.xlabel("Vulnérabilité")
plt.ylabel("Nombre")

plt.show()

# Distribution des revenus
plt.figure(figsize=(8,5))

sns.histplot(df["revenu_mensuel"], bins=30, kde=True)

plt.title("Distribution des revenus mensuels")
plt.xlabel("Revenu")
plt.ylabel("Fréquence")

plt.show()

# Relation entre vulnérabilité et revenu
plt.figure(figsize=(8,5))

sns.boxplot(x="vulnerabilite", y="revenu_mensuel", data=df)

plt.title("Revenu selon la vulnérabilité")

plt.show()


# Taille du ménage selon la vulnérabilité
plt.figure(figsize=(8,5))

sns.boxplot(x="vulnerabilite", y="taille_menage", data=df)

plt.title("Taille du ménage selon la vulnérabilité")

plt.show()

# verification de la corrélation
df_numeric = df.copy()

df_numeric["acces_eau"] = df_numeric["acces_eau"].map({"oui":1, "non":0})
df_numeric["electricite"] = df_numeric["electricite"].map({"oui":1, "non":0})
df_numeric["alimentation_suffisante"] = df_numeric["alimentation_suffisante"].map({"oui":1, "non":0})
df_numeric["acces_internet"] = df_numeric["acces_internet"].map({"oui":1, "non":0})

#matrice de corrélation
plt.figure(figsize=(10,8))

corr = df_numeric.corr(numeric_only=True)

sns.heatmap(corr, annot=True, cmap="coolwarm")

plt.title("Matrice de corrélation")

plt.show()